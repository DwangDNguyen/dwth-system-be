package com.dwth_system.profile.service;

import com.dwth_system.profile.dto.PatientDTO;
import com.dwth_system.profile.dto.ProfileCreatedResponse;
import com.dwth_system.profile.exception.ProfileException;

public interface PatientService {

    public ProfileCreatedResponse addPatient(PatientDTO patientDTO) throws ProfileException;

    public PatientDTO getPatient(String id) throws ProfileException;
}
