package com.siranaba.backend.service;

import com.mongodb.client.gridfs.model.GridFSFile;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.Attachment;
import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.repository.TicketRepository;
import com.siranaba.backend.security.JwtAuthenticationFilter.AuthenticatedUser;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.*;

/** Private, durable file storage. Ticket JSON contains references, never client-supplied URLs or bytes. */
@Service
public class AttachmentStorageService {
    public static final int MAX_FILES = 5;
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    private final GridFsTemplate files;
    private final MongoTemplate mongo;
    private final TicketRepository tickets;
    private final TenantContext tenants;

    public AttachmentStorageService(GridFsTemplate files, MongoTemplate mongo, TicketRepository tickets, TenantContext tenants) {
        this.files = files; this.mongo = mongo; this.tickets = tickets; this.tenants = tenants;
    }

    public record Media(String name, String contentType, byte[] bytes) {}
    public record Download(String name, String contentType, long size, Resource resource) {}

    public List<Attachment> upload(List<MultipartFile> uploads) throws IOException {
        String owner = tenants.currentTenantId();
        if (uploads == null || uploads.isEmpty() || uploads.size() > MAX_FILES) throw bad("Choose between 1 and 5 files.");
        List<Media> validated = new ArrayList<>();
        for (MultipartFile upload : uploads) {
            if (upload.isEmpty() || upload.getSize() > MAX_BYTES) throw bad("Each file must be nonempty and no larger than 5 MB.");
            byte[] bytes = upload.getInputStream().readNBytes(MAX_BYTES + 1);
            validated.add(validate(upload.getOriginalFilename(), bytes));
        }
        List<Attachment> result = new ArrayList<>();
        try {
            for (Media media : validated) {
                ObjectId id = files.store(new ByteArrayInputStream(media.bytes()), media.name(), media.contentType(),
                        new Document("ownerTenantId", owner));
                result.add(reference(id.toHexString(), media.name(), media.contentType()));
            }
            return result;
        } catch (RuntimeException ex) {
            for (Attachment attachment : result) {
                try { files.delete(query(attachment.getId())); } catch (RuntimeException ignored) { /* Retain original failure. */ }
            }
            throw ex;
        }
    }

    /** Only server-owned metadata is accepted; existing legacy attachments can be retained, not forged. */
    public List<Attachment> resolve(List<Attachment> requested, String tenantId, List<Attachment> existing) {
        if (requested == null) return List.of();
        if (requested.size() > MAX_FILES) throw bad("A ticket can have at most 5 attachments.");
        List<Attachment> result = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        for (Attachment input : requested) {
            if (input == null || input.getId() == null || !ids.add(input.getId())) throw bad("Invalid or duplicate attachment.");
            Attachment old = existing == null ? null : existing.stream().filter(a -> input.getId().equals(a.getId())).findFirst().orElse(null);
            if (old != null && old.getDataUrl() != null) { result.add(old); continue; }
            GridFSFile file = find(input.getId());
            if (!tenantId.equals(owner(file))) throw missing();
            result.add(reference(input.getId(), file.getFilename(), contentType(file)));
        }
        return result;
    }

    public Ticket decorate(Ticket ticket) {
        if (ticket.getAttachments() != null) for (Attachment attachment : ticket.getAttachments()) {
            // Also expose historical embedded evidence via an authenticated endpoint.
            String path = "/api/attachments/tickets/" + ticket.getId() + "/" + attachment.getId();
            attachment.setPreviewUrl(path);
        }
        return ticket;
    }

    public Download download(String id) {
        GridFSFile file = find(id);
        AuthenticatedUser user = user();
        boolean admin = "ADMIN".equals(user.role()) && mongo.exists(Query.query(Criteria.where("attachments.id").is(id)), Ticket.class);
        if (!admin && !Objects.equals(user.tenantId(), owner(file))) throw missing();
        return new Download(file.getFilename(), contentType(file), file.getLength(), files.getResource(file));
    }

    public Download downloadTicket(String ticketId, String id) throws IOException {
        Ticket ticket = tickets.findById(ticketId).orElseThrow(AttachmentStorageService::missing);
        AuthenticatedUser user = user();
        if (!"ADMIN".equals(user.role()) && !Objects.equals(user.tenantId(), ticket.getTenantId())) throw missing();
        Attachment attachment = ticket.getAttachments().stream().filter(a -> id.equals(a.getId())).findFirst().orElseThrow(AttachmentStorageService::missing);
        if (attachment.getDataUrl() == null) return download(id);
        Media media = evidence(attachment);
        return new Download(media.name(), media.contentType(), media.bytes().length, new ByteArrayResource(media.bytes()));
    }

    /** Internal worker access; never resolves an arbitrary URL or filesystem path. */
    public Media evidence(Attachment attachment) throws IOException {
        if (attachment.getDataUrl() != null) {
            String data = attachment.getDataUrl();
            int separator = data.indexOf(";base64,");
            if (!data.startsWith("data:") || separator < 0 || data.length() > MAX_BYTES * 4 / 3 + 256) throw bad("Unsupported legacy attachment.");
            try { return validate(attachment.getLabel(), Base64.getDecoder().decode(data.substring(separator + 8))); }
            catch (IllegalArgumentException ex) { throw bad("Invalid legacy attachment."); }
        }
        GridFSFile file = find(attachment.getId());
        try (var stream = files.getResource(file).getInputStream()) {
            return validate(file.getFilename(), stream.readNBytes(MAX_BYTES + 1));
        }
    }

    static Media validate(String filename, byte[] bytes) {
        if (bytes.length == 0 || bytes.length > MAX_BYTES) throw bad("Each file must be nonempty and no larger than 5 MB.");
        String name = filename == null ? "attachment" : filename.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "_");
        if (name.isBlank()) name = "attachment";
        if (name.length() > 150) name = name.substring(name.length() - 150);
        String type;
        if (bytes.length >= 8 && Arrays.equals(Arrays.copyOf(bytes, 8), new byte[]{(byte)137,80,78,71,13,10,26,10})) type = "image/png";
        else if (bytes.length >= 3 && bytes[0] == (byte)255 && bytes[1] == (byte)216 && bytes[2] == (byte)255) type = "image/jpeg";
        else if (bytes.length >= 5 && new String(bytes, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")) type = "application/pdf";
        else throw bad("Only JPEG, PNG and PDF files are supported.");
        if (type.startsWith("image/")) {
            try (var input = javax.imageio.ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers = javax.imageio.ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw bad("Invalid image.");
                var reader = readers.next();
                try {
                    reader.setInput(input);
                    int width = reader.getWidth(0), height = reader.getHeight(0);
                    if (width <= 0 || height <= 0 || (long) width * height > 40_000_000) throw bad("Image exceeds 40 megapixels.");
                } finally { reader.dispose(); }
            } catch (IOException ex) { throw bad("Invalid image."); }
        }
        // Use a type-correct extension even if the browser supplied a misleading one.
        String extension = type.equals("application/pdf") ? ".pdf" : type.equals("image/png") ? ".png" : ".jpg";
        if (!name.toLowerCase(Locale.ROOT).endsWith(extension)) name += extension;
        return new Media(name, type, bytes);
    }

    private Attachment reference(String id, String name, String type) { return new Attachment(id, name, "/api/attachments/" + id, null); }
    private GridFSFile find(String id) { GridFSFile file = files.findOne(query(id)); if (file == null) throw missing(); return file; }
    private static Query query(String id) { if (id == null || !ObjectId.isValid(id)) throw missing(); return Query.query(Criteria.where("_id").is(new ObjectId(id))); }
    private static String owner(GridFSFile file) { return file.getMetadata() == null ? null : file.getMetadata().getString("ownerTenantId"); }
    private static String contentType(GridFSFile file) { return file.getMetadata() == null ? "application/octet-stream" : file.getMetadata().getString("_contentType"); }
    private static AuthenticatedUser user() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser user) return user;
        throw new ApiException(HttpStatus.UNAUTHORIZED, "Sign in to access attachments.");
    }
    private static ApiException bad(String message) { return new ApiException(HttpStatus.BAD_REQUEST, message); }
    private static ApiException missing() { return new ApiException(HttpStatus.NOT_FOUND, "Attachment not found."); }
}
