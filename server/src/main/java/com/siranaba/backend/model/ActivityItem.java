package com.siranaba.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActivityItem {
    private String id;
    private String title;
    private Instant timestamp;
    private String status;
}
