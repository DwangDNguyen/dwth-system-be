package com.dwth_system.profile.service;

import com.dwth_system.profile.dto.DoctorDTO;
import com.dwth_system.profile.dto.ProfileCreatedResponse;
import com.dwth_system.profile.exception.ProfileException;

public interface DoctorService {

    public ProfileCreatedResponse addDoctor(DoctorDTO doctorDTO) throws ProfileException;

    public DoctorDTO getDoctor(String id) throws ProfileException;
}
