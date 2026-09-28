package com.siranaba.backend.service;

import com.siranaba.backend.model.Ticket;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TicketReportLocationTest {
    @Test
    void derivesFloorFromUnitForExistingAndNewReports() {
        Ticket ticket = new Ticket();
        for (String[] example : new String[][]{{"405", "4"}, {"1203", "12"}, {"2410", "24"}, {"0405", "4"}, {"PH25", "25"}, {"PH26-1", "26"}}) {
            ticket.setUnit(example[0]);
            assertEquals(example[1], ticket.getFloorNumber());
        }
        ticket.setUnit(null);
        assertNull(ticket.getFloorNumber());
        ticket.setUnit("unknown");
        assertNull(ticket.getFloorNumber());
    }

    @Test
    void apiSerializesComputedFloor() throws Exception {
        Ticket ticket = new Ticket();
        ticket.setUnit("1203");
        var json = new ObjectMapper().valueToTree(ticket);
        assertEquals("12", json.get("floorNumber").asText());
        ticket.setUnit("405");
        assertEquals("4", new ObjectMapper().valueToTree(ticket).get("floorNumber").asText());
    }
}
