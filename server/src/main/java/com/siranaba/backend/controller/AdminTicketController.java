package com.siranaba.backend.controller;

import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.service.TicketService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Shared ticket feed for the admin dispatch console. SecurityConfig limits this to admins. */
@RestController
@RequestMapping("/api/admin/tickets")
public class AdminTicketController {
    private final TicketService ticketService;

    public AdminTicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @GetMapping
    public List<Ticket> list() {
        return ticketService.listForAdmin();
    }
}
