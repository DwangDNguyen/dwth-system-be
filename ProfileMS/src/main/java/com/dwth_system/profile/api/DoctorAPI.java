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
import com.dwth_system.profile.dto.DoctorDTO;
import com.dwth_system.profile.dto.ProfileCreatedResponse;
import com.dwth_system.profile.exception.ProfileException;
import com.dwth_system.profile.service.DoctorService;

@RestController
@RequestMapping("/profile/doctor")
@Validated
@CrossOrigin
public class DoctorAPI {

    @Autowired
    private DoctorService doctorService;

    @PostMapping("/add")
    public ResponseEntity<ApiResponse<ProfileCreatedResponse>> addDoctor(@RequestBody DoctorDTO doctorDTO) throws ProfileException {
        ProfileCreatedResponse response = doctorService.addDoctor(doctorDTO);
        return new ResponseEntity<>(
                ApiResponse.success("Doctor profile created successfully", response),
                HttpStatus.CREATED
        );
    }
}
