package com.dwth_system.profile.entity;

import java.time.LocalDate;

import com.dwth_system.profile.constant.BloodGroup;
import com.dwth_system.profile.dto.PatientDTO;

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
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    private String id;
    private String name;
    @Column(unique = true)
    private String email;
    private LocalDate dob;
    private String phone;
    private String address;
    private BloodGroup bloodGroup;
    private String gender;
    @Column(unique = true)
    private String aadharNo;

    public PatientDTO toDTO() {
        return new PatientDTO(this.id, this.name, this.email, this.phone, this.dob, this.address, this.bloodGroup, this.gender, this.aadharNo);
    }
}
