package com.siranaba.backend.dto;

public record MeResponse(String email, String role, boolean mustChangePassword) {
}
