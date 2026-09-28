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
    /** Legacy MongoDB data only. New uploads use GridFS; never accept or expose embedded bytes through JSON. */
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String dataUrl;
}
