package com.dwth_system.profile.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.dwth_system.profile.dto.DoctorDTO;
import com.dwth_system.profile.dto.ProfileCreatedResponse;
import com.dwth_system.profile.entity.Doctor;
import com.dwth_system.profile.exception.ProfileException;
import com.dwth_system.profile.repository.DoctorRepository;

@Service
public class DoctorServiceImpl implements DoctorService {

    @Autowired
    private DoctorRepository doctorRepository;

    @Override
    public ProfileCreatedResponse addDoctor(DoctorDTO doctorDTO) throws ProfileException {
        if (doctorDTO.getEmail() != null && doctorRepository.findByEmail(doctorDTO.getEmail()).isPresent()) {
            throw new ProfileException("DOCTOR_ALREADY_EXISTS");
        }
        if (doctorDTO.getLicenseNo() != null && doctorRepository.findByLicenseNo(doctorDTO.getLicenseNo()).isPresent()) {
            throw new ProfileException("DOCTOR_ALREADY_EXISTS");
        }

        Doctor savedDoctor = doctorRepository.save(doctorDTO.toEntity());

        return new ProfileCreatedResponse(
                savedDoctor.getId(),
                savedDoctor.getEmail(),
                savedDoctor.getName(),
                "DOCTOR"
        );
    }

    @Override
    public DoctorDTO getDoctor(String id) throws ProfileException {
        return doctorRepository.findById(id).orElseThrow(() -> new ProfileException("Doctor not found.")).toDTO();
    }
}
