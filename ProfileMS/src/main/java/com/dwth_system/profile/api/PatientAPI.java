package com.dwth_system.profile.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dwth_system.profile.dto.ApiResponse;
import com.dwth_system.profile.dto.PatientDTO;
import com.dwth_system.profile.dto.ProfileCreatedResponse;
import com.dwth_system.profile.exception.ProfileException;
import com.dwth_system.profile.service.PatientService;

@RestController
@RequestMapping("/profile/patient")
@Validated
@CrossOrigin
public class PatientAPI {

    @Autowired
    private PatientService patientService;

    @PostMapping("/add")
    public ResponseEntity<ApiResponse<ProfileCreatedResponse>> addPatient(@RequestBody PatientDTO patientDTO) throws ProfileException {
        ProfileCreatedResponse response = patientService.addPatient(patientDTO);
        return new ResponseEntity<>(
                ApiResponse.success("Patient profile created successfully", response),
                HttpStatus.CREATED
        );
    }

}
