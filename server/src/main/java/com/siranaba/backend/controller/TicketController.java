package com.siranaba.backend.controller;

import com.siranaba.backend.dto.CreateTicketRequest;
import com.siranaba.backend.dto.TicketListResponse;
import com.siranaba.backend.dto.UpdateTicketRequest;
import com.siranaba.backend.model.Ticket;
import com.siranaba.backend.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    // Matches the categories offered in the original mockDb.js ticketCategories
    // array. This is static UI configuration, not tenant data, so it doesn't
    // need its own Mongo collection - update the list here if it changes.
    private static final List<String> TICKET_CATEGORIES = List.of(
            "Plumbing", "Electrical", "HVAC", "Appliance",
            "Locksmith", "Structural", "Pest Control", "Other"
    );

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @GetMapping
    public TicketListResponse list() {
        return ticketService.list();
    }

    @GetMapping("/categories")
    public List<String> categories() {
        return TICKET_CATEGORIES;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Ticket create(@Valid @RequestBody CreateTicketRequest request) {
        return ticketService.create(request);
    }

    @GetMapping("/{id}")
    public Ticket get(@PathVariable String id) {
        return ticketService.get(id);
    }

    @PatchMapping("/{id}")
    public Ticket update(@PathVariable String id, @RequestBody UpdateTicketRequest request) {
        return ticketService.update(id, request);
    }
}
