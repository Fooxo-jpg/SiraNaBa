package com.siranaba.backend.dto;

public record LoginResponse(String token, String email, String role) {
}
