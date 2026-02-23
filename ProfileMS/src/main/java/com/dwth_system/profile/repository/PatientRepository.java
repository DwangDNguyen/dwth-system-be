package com.dwth_system.profile.repository;

import java.util.Optional;

import org.springframework.data.repository.CrudRepository;

import com.dwth_system.profile.entity.Patient;

public interface PatientRepository extends CrudRepository<Patient, String> {

    Optional<Patient> findByEmail(String email);

    Optional<Patient> findByAadharNo(String aadharNo);
}
