package com.siranaba.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ManagementTool {
    private String id;
    private String title;
    private String description;
    private String icon;
    private String route;
}
