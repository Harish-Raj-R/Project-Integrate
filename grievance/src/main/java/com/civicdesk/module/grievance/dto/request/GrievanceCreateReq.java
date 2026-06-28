package com.civicdesk.module.grievance.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Payload to raise a grievance. {@code citizenId} comes from the JWT, not here.
 * {@code category} is a short code (RI, WS, SN, SD, CR, OT) validated in the service.
 */
@Data
public class GrievanceCreateReq {

    @NotBlank(message = "category is required")
    private String category;

    @NotBlank(message = "grievanceTitle is required")
    @Size(max = 150, message = "grievanceTitle must be at most 150 characters")
    private String grievanceTitle;

    @NotBlank(message = "description is required")
    @Size(max = 2000, message = "description must be at most 2000 characters")
    private String description;

    @Size(max = 50, message = "ward must be at most 50 characters")
    private String ward;
}
