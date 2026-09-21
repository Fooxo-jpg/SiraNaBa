package com.siranaba.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Attachment {
    private String id;
    private String label;
    private String previewUrl;
    /** Base64 data URL retained so Gemini can inspect tenant-provided media. */
    private String dataUrl;
}
