package com.dwth_system.profile.entity;

import java.time.LocalDate;

import com.dwth_system.profile.dto.DoctorDTO;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private String name;
    @Column(unique = true)
    private String email;
    private LocalDate dob;
    private String phone;
    private String address;
    private String gender;
    @Column(unique = true)
    private String licenseNo;
    private String specialization;
    private String department;
    private Integer totalExperience;

    public DoctorDTO toDTO() {
        return new DoctorDTO(this.id, this.name, this.email, this.dob, this.phone, this.address, this.gender, this.licenseNo, this.specialization, this.department, this.totalExperience);
    }
}
