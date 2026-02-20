package com.dwth_system.profile.dto;

import java.time.LocalDate;

import com.dwth_system.profile.entity.Doctor;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DoctorDTO {

    private String id;
    private String name;
    private String email;
    private LocalDate dob;
    private String phone;
    private String address;
    private String gender;
    private String licenseNo;
    private String specialization;
    private String department;
    private Integer totalExperience;

    public Doctor toEntity() {
        return new Doctor(this.id, this.name, this.email, this.dob, this.phone, this.address, this.gender, this.licenseNo, this.specialization, this.department, this.totalExperience);
    }
}
