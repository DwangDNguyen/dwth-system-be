package com.dwth_system.profile.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.dwth_system.profile.dto.PatientDTO;
import com.dwth_system.profile.dto.ProfileCreatedResponse;
import com.dwth_system.profile.entity.Patient;
import com.dwth_system.profile.exception.ProfileException;
import com.dwth_system.profile.repository.PatientRepository;

@Service
public class PatientServiceImpl implements PatientService {

    @Autowired
    private PatientRepository patientRepository;

    @Override
    public ProfileCreatedResponse addPatient(PatientDTO patientDTO) throws ProfileException {
        if (patientDTO.getEmail() != null && patientRepository.findByEmail(patientDTO.getEmail()).isPresent()) {
            throw new ProfileException("PATIENT_ALREADY_EXISTS");
        }
        if (patientDTO.getAadharNo() != null && patientRepository.findByAadharNo(patientDTO.getAadharNo()).isPresent()) {
            throw new ProfileException("PATIENT_ALREADY_EXISTS");
        }

        Patient savedPatient = patientRepository.save(patientDTO.toEntity());

        return new ProfileCreatedResponse(
                savedPatient.getId(),
                savedPatient.getEmail(),
                savedPatient.getName(),
                "PATIENT"
        );
    }

    @Override
    public PatientDTO getPatient(String id) throws ProfileException {
        return patientRepository.findById(id).orElseThrow(() -> new ProfileException("Patient not found.")).toDTO();
    }
}
