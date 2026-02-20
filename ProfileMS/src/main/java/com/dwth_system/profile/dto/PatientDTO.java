package com.dwth_system.profile.dto;

import java.time.LocalDate;

import com.dwth_system.profile.constant.BloodGroup;
import com.dwth_system.profile.entity.Patient;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PatientDTO {

    private String id;
    private String name;
    private String email;
    private String phone;
    private LocalDate dob;
    private String address;
    private BloodGroup bloodGroup;
    private String gender;
    private String aadharNo;

    public Patient toEntity() {
        return new Patient(this.id, this.name, this.email, this.dob, this.phone, this.address, this.bloodGroup, this.gender, this.aadharNo);
    }
}
