package com.siranaba.backend.controller;

import com.siranaba.backend.model.Attachment;
import com.siranaba.backend.service.AttachmentStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/attachments")
public class AttachmentController {
    private final AttachmentStorageService storage;
    public AttachmentController(AttachmentStorageService storage) { this.storage = storage; }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public List<Attachment> upload(@RequestParam("files") List<MultipartFile> files) throws IOException { return storage.upload(files); }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(@PathVariable String id, @RequestParam(defaultValue = "false") boolean download) {
        return response(storage.download(id), download);
    }

    @GetMapping("/tickets/{ticketId}/{id}")
    public ResponseEntity<Resource> downloadTicket(@PathVariable String ticketId, @PathVariable String id,
                                                  @RequestParam(defaultValue = "false") boolean download) throws IOException {
        return response(storage.downloadTicket(ticketId, id), download);
    }

    private ResponseEntity<Resource> response(AttachmentStorageService.Download file, boolean download) {
        String type = file.contentType() == null ? "application/octet-stream" : file.contentType();
        boolean inline = !download && (type.equals("image/png") || type.equals("image/jpeg"));
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(type)).contentLength(file.size())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.builder(inline ? "inline" : "attachment").filename(file.name(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff").header("Content-Security-Policy", "sandbox")
                .cacheControl(CacheControl.noStore()).body(file.resource());
    }
}
