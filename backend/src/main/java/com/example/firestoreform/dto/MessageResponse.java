package com.example.firestoreform.dto;

import java.time.Instant;

/**
 * Representa um documento da coleção contactMessages retornado pela API.
 */
public record MessageResponse(
        String id,
        String name,
        String email,
        String message,
        Instant createdAt
) {
}

