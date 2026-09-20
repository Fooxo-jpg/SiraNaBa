package com.siranaba.backend.dto;

import com.siranaba.backend.model.Tenant;
import com.siranaba.backend.model.Ticket;

import java.util.List;

public record TicketListResponse(List<Ticket> tickets, Tenant.ServiceHealth serviceHealth) {
}
