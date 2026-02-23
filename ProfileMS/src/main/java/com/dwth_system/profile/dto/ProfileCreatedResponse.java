package com.dwth_system.profile.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO when a profile (Doctor/Patient) is successfully created
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfileCreatedResponse {

    @JsonProperty("id")
    private String id;

    @JsonProperty("email")
    private String email;

    @JsonProperty("name")
    private String name;

    @JsonProperty("profile_type")
    private String profileType; // "DOCTOR" or "PATIENT"
}

