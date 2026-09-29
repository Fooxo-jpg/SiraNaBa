package com.siranaba.backend.controller;

import com.siranaba.backend.dto.AuditLogSummaryResponse;
import com.siranaba.backend.dto.DatabaseStatusResponse;
import com.siranaba.backend.exception.ApiException;
import com.siranaba.backend.model.AuditLog;
import com.siranaba.backend.repository.AuditLogRepository;
import com.siranaba.backend.service.AuditLogExportService;
import com.siranaba.backend.service.AuditLogExportService.Filter;
import com.siranaba.backend.service.DatabaseStatusService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin/system")
public class AdminSystemController {

    private final DatabaseStatusService databaseStatusService;
    private final AuditLogRepository auditLogRepository;
    private final AuditLogExportService exportService;

    public AdminSystemController(DatabaseStatusService databaseStatusService, AuditLogRepository auditLogRepository,
                                 AuditLogExportService exportService) {
        this.databaseStatusService = databaseStatusService;
        this.auditLogRepository = auditLogRepository;
        this.exportService = exportService;
    }

    @GetMapping("/database")
    public DatabaseStatusResponse database() {
        return databaseStatusService.check();
    }

    /** Admin > Configuration > System Logs tab. */
    @GetMapping("/logs")
    public List<AuditLog> logs() {
        return auditLogRepository.findTop200ByOrderByTimestampDesc();
    }

    /** Export dialog: how many logs exist overall and how many match the chosen filters. */
    @GetMapping("/logs/summary")
    public AuditLogSummaryResponse logSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String tag) {
        return exportService.summary(new Filter(from, to, level, action, tag));
    }

    /**
     * Full Audit Trail download. format = xlsx (default) | csv | pdf.
     * With no filters this returns every log since the first one was written.
     */
    @GetMapping("/logs/export")
    public ResponseEntity<byte[]> exportLogs(
            @RequestParam(defaultValue = "xlsx") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String tag,
            Authentication auth) {
        Filter filter = new Filter(from, to, level, action, tag);
        String by = auth == null ? null : auth.getName();
        String fmt = format.toLowerCase(Locale.ROOT);

        byte[] body;
        MediaType type;
        switch (fmt) {
            case "xlsx" -> {
                body = exportService.xlsx(filter, by);
                type = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            }
            case "csv" -> {
                body = exportService.csv(filter);
                type = MediaType.parseMediaType("text/csv; charset=UTF-8");
            }
            case "pdf" -> {
                body = exportService.pdf(filter, by);
                type = MediaType.APPLICATION_PDF;
            }
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported format. Use xlsx, csv or pdf.");
        }

        String range = (from == null && to == null) ? "all" : (from == null ? "start" : from) + "_to_" + (to == null ? "latest" : to);
        String stamp = LocalDateTime.now(AuditLogExportService.MANILA).format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm"));
        String filename = "siranaba-audit-log_" + range + "_" + stamp + "." + fmt;
        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build().toString())
                .body(body);
    }
}
