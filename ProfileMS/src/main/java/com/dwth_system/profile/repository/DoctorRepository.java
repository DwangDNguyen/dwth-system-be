package com.dwth_system.profile.repository;

import java.util.Optional;

import org.springframework.data.repository.CrudRepository;

import com.dwth_system.profile.entity.Doctor;

public interface DoctorRepository extends CrudRepository<Doctor, String> {

    Optional<Doctor> findByEmail(String email);

    Optional<Doctor> findByLicenseNo(String licenseNo);
}
