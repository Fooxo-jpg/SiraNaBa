package com.siranaba.backend.controller;

import com.siranaba.backend.dto.AssignTicketRequest;
import com.siranaba.backend.dto.UpdateDispatchStatusRequest;
import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.service.AdminTicketDispatchService;
import com.siranaba.backend.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Shared ticket feed for the admin dispatch console. SecurityConfig limits this to admins. */
@RestController
@RequestMapping("/api/admin/tickets")
public class AdminTicketController {
    private final TicketService ticketService;
    private final AdminTicketDispatchService adminTicketDispatchService;

    public AdminTicketController(TicketService ticketService, AdminTicketDispatchService adminTicketDispatchService) {
        this.ticketService = ticketService;
        this.adminTicketDispatchService = adminTicketDispatchService;
    }

    @GetMapping
    public List<Ticket> list() {
        return ticketService.listForAdmin();
    }

    @PostMapping("/{ticketId}/assign")
    public Ticket assign(@PathVariable String ticketId, @Valid @RequestBody AssignTicketRequest request) {
        return adminTicketDispatchService.assign(ticketId, request.staffId());
    }

    @PostMapping("/{ticketId}/dispatch-status")
    public Ticket updateDispatchStatus(@PathVariable String ticketId, @Valid @RequestBody UpdateDispatchStatusRequest request) {
        return adminTicketDispatchService.updateDispatchStatus(ticketId, request.status());
    }
}
