package com.siranaba.backend.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.HeaderFooter;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.siranaba.backend.dto.AuditLogSummaryResponse;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.AuditLog;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Builds the "Full Audit Trail" downloads (Excel, CSV, PDF) from the audit_logs collection.
 * With no filters every log since the very first one is included. All times are Philippine Time.
 */
@Service
public class AuditLogExportService {

    public static final ZoneId MANILA = ZoneId.of("Asia/Manila");
    private static final Set<String> LEVELS = Set.of("INFO", "WARN", "ERROR");
    private static final Set<String> ACTIONS = Set.of("Insert", "Update", "Delete");
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss", Locale.ENGLISH);
    private static final DateTimeFormatter LONG_DATE_TIME = DateTimeFormatter.ofPattern("d MMM yyyy, h:mm:ss a", Locale.ENGLISH);

    /** Filters from the export dialog. Any field may be null = "no restriction". from/to are inclusive PHT dates. */
    public record Filter(LocalDate from, LocalDate to, String level, String action, String tag) {}

    private final MongoTemplate mongo;

    public AuditLogExportService(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    // ---------------------------------------------------------------- querying

    private Query query(Filter f) {
        if (f.from() != null && f.to() != null && f.from().isAfter(f.to())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "The start date must be on or before the end date.");
        }
        List<Criteria> parts = new ArrayList<>();
        if (f.from() != null) parts.add(Criteria.where("timestamp").gte(f.from().atStartOfDay(MANILA).toInstant()));
        if (f.to() != null) parts.add(Criteria.where("timestamp").lt(f.to().plusDays(1).atStartOfDay(MANILA).toInstant()));
        if (notBlank(f.level())) {
            String level = f.level().trim().toUpperCase(Locale.ROOT);
            if (!LEVELS.contains(level)) throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown level: " + f.level());
            parts.add(Criteria.where("level").is(level));
        }
        if (notBlank(f.action())) {
            String action = titleCase(f.action().trim());
            if (!ACTIONS.contains(action)) throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown action: " + f.action());
            parts.add(Criteria.where("action").is(action));
        }
        if (notBlank(f.tag())) parts.add(Criteria.where("tag").is(f.tag().trim().toUpperCase(Locale.ROOT)));

        Query q = new Query();
        if (!parts.isEmpty()) q.addCriteria(new Criteria().andOperator(parts.toArray(new Criteria[0])));
        return q;
    }

    /** Oldest first, so the file reads as a history from the very first entry. */
    private List<AuditLog> find(Filter f) {
        Query q = query(f).with(Sort.by(Sort.Order.asc("timestamp"), Sort.Order.asc("_id")));
        return mongo.find(q, AuditLog.class);
    }

    public AuditLogSummaryResponse summary(Filter f) {
        long total = mongo.count(new Query(), AuditLog.class);
        long matching = mongo.count(query(f), AuditLog.class);
        AuditLog first = mongo.findOne(new Query().with(Sort.by(Sort.Order.asc("timestamp"))).limit(1), AuditLog.class);
        AuditLog last = mongo.findOne(new Query().with(Sort.by(Sort.Order.desc("timestamp"))).limit(1), AuditLog.class);
        List<String> tags = new ArrayList<>(mongo.findDistinct(new Query(), "tag", AuditLog.class, String.class));
        tags.removeIf(t -> t == null || t.isBlank());
        tags.sort(String::compareToIgnoreCase);
        return new AuditLogSummaryResponse(total, matching,
                first == null ? null : first.getTimestamp(), last == null ? null : last.getTimestamp(), tags);
    }

    // ---------------------------------------------------------------- CSV

    public byte[] csv(Filter f) {
        List<AuditLog> logs = find(f);
        StringBuilder sb = new StringBuilder("\uFEFF"); // BOM so Excel opens UTF-8 correctly
        sb.append("No.,Date (PHT),Time (PHT),Level,Action,Module,Description,Log ID\r\n");
        int n = 1;
        for (AuditLog l : logs) {
            LocalDateTime t = local(l.getTimestamp());
            sb.append(n++).append(',')
              .append(t == null ? "" : t.toLocalDate()).append(',')
              .append(t == null ? "" : t.toLocalTime().withNano(0)).append(',')
              .append(csvCell(l.getLevel())).append(',')
              .append(csvCell(l.getAction())).append(',')
              .append(csvCell(l.getTag())).append(',')
              .append(csvCell(l.getText())).append(',')
              .append(csvCell(l.getId())).append("\r\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String csvCell(String v) {
        if (v == null) return "";
        // Stop spreadsheet apps from running a log message that starts like a formula.
        if (!v.isEmpty() && "=+-@\t\r".indexOf(v.charAt(0)) >= 0) v = "'" + v;
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }

    // ---------------------------------------------------------------- Excel

    public byte[] xlsx(Filter f, String generatedBy) {
        List<AuditLog> logs = find(f);
        try (SXSSFWorkbook wb = new SXSSFWorkbook(200); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Styles st = new Styles(wb);
            writeSummarySheet(wb, st, logs, f, generatedBy);
            writeLogSheet(wb, st, logs);
            writeDailySheet(wb, st, logs);
            wb.write(out);
            wb.dispose();
            return out.toByteArray();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Couldn't build the Excel file.");
        }
    }

    private void writeSummarySheet(SXSSFWorkbook wb, Styles st, List<AuditLog> logs, Filter f, String generatedBy) {
        SXSSFSheet sh = wb.createSheet("Summary");
        sh.setColumnWidth(0, 26 * 256);
        sh.setColumnWidth(1, 44 * 256);
        sh.setColumnWidth(2, 14 * 256);
        int r = 0;

        Row title = sh.createRow(r++);
        title.setHeightInPoints(26);
        text(title, 0, "SiraNaBa - System Audit Trail", st.title);
        r++;

        r = kv(sh, r, st, "Generated (PHT)", LocalDateTime.now(MANILA).format(LONG_DATE_TIME));
        r = kv(sh, r, st, "Generated by", generatedBy == null ? "Administrator" : generatedBy);
        r = kv(sh, r, st, "Date range", rangeLabel(f));
        r = kv(sh, r, st, "Level filter", notBlank(f.level()) ? f.level().toUpperCase(Locale.ROOT) : "All levels");
        r = kv(sh, r, st, "Action filter", notBlank(f.action()) ? titleCase(f.action()) : "All actions");
        r = kv(sh, r, st, "Module filter", notBlank(f.tag()) ? f.tag().toUpperCase(Locale.ROOT) : "All modules");
        r = kv(sh, r, st, "Total records", String.valueOf(logs.size()));
        if (!logs.isEmpty()) {
            r = kv(sh, r, st, "First entry", local(logs.get(0).getTimestamp()).format(LONG_DATE_TIME));
            r = kv(sh, r, st, "Latest entry", local(logs.get(logs.size() - 1).getTimestamp()).format(LONG_DATE_TIME));
        }
        r = kv(sh, r, st, "Time zone", "Philippine Time (UTC+08:00)");
        r++;

        r = countTable(sh, r, st, "By action", count(logs, AuditLog::getAction), logs.size());
        r++;
        r = countTable(sh, r, st, "By level", count(logs, AuditLog::getLevel), logs.size());
        r++;
        countTable(sh, r, st, "By module", count(logs, AuditLog::getTag), logs.size());
    }

    private void writeLogSheet(SXSSFWorkbook wb, Styles st, List<AuditLog> logs) {
        SXSSFSheet sh = wb.createSheet("Audit Log");
        String[] heads = {"No.", "Timestamp (PHT)", "Level", "Action", "Module", "Description", "Log ID"};
        int[] widths = {8, 22, 10, 12, 16, 90, 28};
        for (int i = 0; i < widths.length; i++) sh.setColumnWidth(i, widths[i] * 256);

        Row head = sh.createRow(0);
        head.setHeightInPoints(22);
        for (int i = 0; i < heads.length; i++) text(head, i, heads[i], st.header);

        int r = 1;
        for (AuditLog l : logs) {
            Row row = sh.createRow(r);
            Cell no = row.createCell(0); no.setCellValue(r); no.setCellStyle(st.centered);
            Cell ts = row.createCell(1);
            LocalDateTime t = local(l.getTimestamp());
            if (t != null) ts.setCellValue(t);
            ts.setCellStyle(st.dateTime);
            String level = l.getLevel() == null ? "" : l.getLevel();
            text(row, 2, level, "ERROR".equals(level) ? st.levelError : "WARN".equals(level) ? st.levelWarn : st.centered);
            text(row, 3, l.getAction(), st.body);
            text(row, 4, l.getTag(), st.body);
            text(row, 5, l.getText(), st.body);
            text(row, 6, l.getId(), st.muted);
            r++;
        }
        sh.createFreezePane(0, 1);
        if (!logs.isEmpty()) sh.setAutoFilter(new CellRangeAddress(0, logs.size(), 0, heads.length - 1));
    }

    private void writeDailySheet(SXSSFWorkbook wb, Styles st, List<AuditLog> logs) {
        SXSSFSheet sh = wb.createSheet("Daily Activity");
        String[] heads = {"Date (PHT)", "Total", "Insert", "Update", "Delete", "Warnings / Errors"};
        for (int i = 0; i < heads.length; i++) sh.setColumnWidth(i, (i == 0 ? 16 : 14) * 256);
        Row head = sh.createRow(0);
        head.setHeightInPoints(22);
        for (int i = 0; i < heads.length; i++) text(head, i, heads[i], st.header);

        Map<LocalDate, int[]> days = new TreeMap<>(); // total, insert, update, delete, warn/error
        for (AuditLog l : logs) {
            LocalDateTime t = local(l.getTimestamp());
            if (t == null) continue;
            int[] d = days.computeIfAbsent(t.toLocalDate(), k -> new int[5]);
            d[0]++;
            if ("Insert".equals(l.getAction())) d[1]++;
            else if ("Update".equals(l.getAction())) d[2]++;
            else if ("Delete".equals(l.getAction())) d[3]++;
            if ("WARN".equals(l.getLevel()) || "ERROR".equals(l.getLevel())) d[4]++;
        }
        int r = 1;
        for (Map.Entry<LocalDate, int[]> e : days.entrySet()) {
            Row row = sh.createRow(r++);
            text(row, 0, e.getKey().toString(), st.body);
            for (int i = 0; i < 5; i++) {
                Cell c = row.createCell(i + 1);
                c.setCellValue(e.getValue()[i]);
                c.setCellStyle(st.centered);
            }
        }
        sh.createFreezePane(0, 1);
    }

    private int kv(SXSSFSheet sh, int r, Styles st, String label, String value) {
        Row row = sh.createRow(r);
        text(row, 0, label, st.label);
        text(row, 1, value, st.body);
        return r + 1;
    }

    private int countTable(SXSSFSheet sh, int r, Styles st, String title, Map<String, Integer> counts, int total) {
        Row h = sh.createRow(r++);
        text(h, 0, title, st.header);
        text(h, 1, "Records", st.header);
        text(h, 2, "Share", st.header);
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            Row row = sh.createRow(r++);
            text(row, 0, e.getKey(), st.body);
            Cell c = row.createCell(1); c.setCellValue(e.getValue()); c.setCellStyle(st.leftNumber);
            Cell p = row.createCell(2); p.setCellValue(total == 0 ? 0 : e.getValue() / (double) total); p.setCellStyle(st.percent);
        }
        return r;
    }

    private static Map<String, Integer> count(List<AuditLog> logs, java.util.function.Function<AuditLog, String> key) {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (AuditLog l : logs) {
            String k = key.apply(l);
            m.merge(k == null || k.isBlank() ? "(none)" : k, 1, Integer::sum);
        }
        List<Map.Entry<String, Integer>> entries = new ArrayList<>(m.entrySet());
        entries.sort(Map.Entry.<String, Integer>comparingByValue().reversed());
        Map<String, Integer> sorted = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> e : entries) sorted.put(e.getKey(), e.getValue());
        return sorted;
    }

    private static void text(Row row, int col, String value, CellStyle style) {
        Cell c = row.createCell(col);
        c.setCellValue(value == null ? "" : value); // always a string cell, so a message like "=1+1" is never evaluated
        c.setCellStyle(style);
    }

    /** Shared cell styles (a workbook can only hold a limited number, so they are created once). */
    private static final class Styles {
        final CellStyle title, header, label, body, muted, centered, leftNumber, percent, dateTime, levelWarn, levelError;

        Styles(SXSSFWorkbook wb) {
            var big = wb.createFont(); big.setBold(true); big.setFontHeightInPoints((short) 16);
            var bold = wb.createFont(); bold.setBold(true);
            var white = wb.createFont(); white.setBold(true); white.setColor(IndexedColors.WHITE.getIndex());
            var grey = wb.createFont(); grey.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
            var red = wb.createFont(); red.setBold(true); red.setColor(IndexedColors.DARK_RED.getIndex());
            var amber = wb.createFont(); amber.setBold(true); amber.setColor(IndexedColors.DARK_YELLOW.getIndex());

            title = wb.createCellStyle(); title.setFont(big);
            header = wb.createCellStyle();
            header.setFont(white);
            header.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex());
            header.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            header.setVerticalAlignment(VerticalAlignment.CENTER);
            header.setAlignment(HorizontalAlignment.LEFT);
            label = wb.createCellStyle(); label.setFont(bold);
            body = wb.createCellStyle(); body.setVerticalAlignment(VerticalAlignment.TOP);
            body.setBorderBottom(BorderStyle.HAIR);
            muted = wb.createCellStyle(); muted.setFont(grey); muted.setBorderBottom(BorderStyle.HAIR);
            centered = wb.createCellStyle(); centered.setAlignment(HorizontalAlignment.CENTER); centered.setBorderBottom(BorderStyle.HAIR);
            leftNumber = wb.createCellStyle(); leftNumber.setAlignment(HorizontalAlignment.LEFT);
            percent = wb.createCellStyle(); percent.setDataFormat(wb.createDataFormat().getFormat("0.0%")); percent.setAlignment(HorizontalAlignment.LEFT);
            dateTime = wb.createCellStyle(); dateTime.setDataFormat(wb.createDataFormat().getFormat("yyyy-mm-dd hh:mm:ss")); dateTime.setBorderBottom(BorderStyle.HAIR);
            levelWarn = wb.createCellStyle(); levelWarn.setFont(amber); levelWarn.setAlignment(HorizontalAlignment.CENTER);
            levelWarn.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex()); levelWarn.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            levelError = wb.createCellStyle(); levelError.setFont(red); levelError.setAlignment(HorizontalAlignment.CENTER);
            levelError.setFillForegroundColor(IndexedColors.ROSE.getIndex()); levelError.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
    }

    // ---------------------------------------------------------------- PDF

    public byte[] pdf(Filter f, String generatedBy) {
        List<AuditLog> logs = find(f);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4.rotate(), 28, 28, 34, 40);
            PdfWriter.getInstance(doc, out);

            HeaderFooter footer = new HeaderFooter(new Phrase("SiraNaBa audit trail  |  Page ", pdfFont(8, Font.NORMAL, Color.GRAY)), true);
            footer.setBorder(Rectangle.NO_BORDER);
            footer.setAlignment(Element.ALIGN_CENTER);
            doc.setFooter(footer);
            doc.open();

            doc.add(new Paragraph("SiraNaBa - System Audit Trail", pdfFont(18, Font.BOLD, Color.BLACK)));
            Font meta = pdfFont(9, Font.NORMAL, Color.DARK_GRAY);
            doc.add(new Paragraph("Generated " + LocalDateTime.now(MANILA).format(LONG_DATE_TIME) + " PHT by "
                    + (generatedBy == null ? "Administrator" : generatedBy), meta));
            doc.add(new Paragraph("Range: " + rangeLabel(f)
                    + "   |   Level: " + (notBlank(f.level()) ? f.level().toUpperCase(Locale.ROOT) : "All")
                    + "   |   Action: " + (notBlank(f.action()) ? titleCase(f.action()) : "All")
                    + "   |   Module: " + (notBlank(f.tag()) ? f.tag().toUpperCase(Locale.ROOT) : "All"), meta));
            Paragraph total = new Paragraph("Total records: " + logs.size(), pdfFont(9, Font.BOLD, Color.BLACK));
            total.setSpacingAfter(10);
            doc.add(total);

            PdfPTable table = new PdfPTable(new float[]{15f, 7f, 9f, 12f, 57f});
            table.setWidthPercentage(100);
            table.setHeaderRows(1);
            Font hf = pdfFont(8, Font.BOLD, Color.WHITE);
            for (String h : new String[]{"Timestamp (PHT)", "Level", "Action", "Module", "Description"}) {
                PdfPCell c = new PdfPCell(new Phrase(h, hf));
                c.setBackgroundColor(new Color(0x1F, 0x5A, 0x3D));
                c.setPadding(5);
                table.addCell(c);
            }
            Font bf = pdfFont(8, Font.NORMAL, Color.BLACK);
            boolean zebra = false;
            for (AuditLog l : logs) {
                LocalDateTime t = local(l.getTimestamp());
                Color bg = zebra ? new Color(0xF4, 0xF6, 0xF4) : Color.WHITE;
                zebra = !zebra;
                Color levelColor = "ERROR".equals(l.getLevel()) ? new Color(0xB0, 0x1E, 0x1E)
                        : "WARN".equals(l.getLevel()) ? new Color(0xA8, 0x6A, 0x00) : Color.BLACK;
                pdfCell(table, t == null ? "" : t.format(DATE_TIME), bf, bg);
                pdfCell(table, l.getLevel(), pdfFont(8, Font.BOLD, levelColor), bg);
                pdfCell(table, l.getAction(), bf, bg);
                pdfCell(table, l.getTag(), bf, bg);
                pdfCell(table, l.getText(), bf, bg);
            }
            if (logs.isEmpty()) {
                PdfPCell empty = new PdfPCell(new Phrase("No audit records match these filters.", bf));
                empty.setColspan(5);
                empty.setPadding(12);
                empty.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(empty);
            }
            doc.add(table);
            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Couldn't build the PDF file.");
        }
    }

    private static Font pdfFont(float size, int style, Color color) {
        return FontFactory.getFont(FontFactory.HELVETICA, size, style, color);
    }

    private static void pdfCell(PdfPTable table, String value, Font font, Color bg) {
        // The built-in PDF font has no peso sign, so spell it out rather than print a blank.
        String v = value == null ? "" : value.replace("\u20B1", "PHP ");
        PdfPCell c = new PdfPCell(new Phrase(v, font));
        c.setPadding(4);
        c.setBackgroundColor(bg);
        c.setBorderColor(new Color(0xDD, 0xDD, 0xDD));
        table.addCell(c);
    }

    // ---------------------------------------------------------------- helpers

    private static LocalDateTime local(Instant i) {
        return i == null ? null : LocalDateTime.ofInstant(i, MANILA);
    }

    private static String rangeLabel(Filter f) {
        if (f.from() == null && f.to() == null) return "All logs since the beginning";
        return (f.from() == null ? "Beginning" : f.from().toString()) + " to " + (f.to() == null ? "Latest" : f.to().toString());
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private static String titleCase(String s) {
        return s.isEmpty() ? s : s.substring(0, 1).toUpperCase(Locale.ROOT) + s.substring(1).toLowerCase(Locale.ROOT);
    }
}
