package com.dwth_system.user.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.dwth_system.user.dto.UserDTO;
import com.dwth_system.user.entity.User;
import com.dwth_system.user.exception.UserException;
import com.dwth_system.user.repository.UserRepository;

@Service("userService")
public class UserServiceImpl implements UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void registerUser(UserDTO userDTO) throws UserException {
        Optional<User> mail = userRepository.findByEmail(userDTO.getEmail());
        if (mail.isPresent()) {
            throw new UserException("USER_ALREADY_EXISTS");
        }
        userDTO.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        userRepository.save(userDTO.toEntity());
    }

    @Override
    public UserDTO loginUser(UserDTO userDTO) throws UserException {
        User user = userRepository.findById(userDTO.getId()).orElseThrow(()
                -> new UserException("USER_NOT_FOUND")
        );
        Boolean match = passwordEncoder.matches(userDTO.getPassword(), user.getPassword());
        if (!match) {
            throw new UserException("INVALID_CREDENTIALS");
        }
        user.setPassword(null);
        return user.toDTO();
    }

    @Override
    public UserDTO getUserById(String id) throws UserException {
        return userRepository.findById(id).orElseThrow(() -> new UserException("USER_NOT_FOUND")).toDTO();
    }

    @Override
    public void updateUser(UserDTO userDTO) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'updateUser'");
    }

    @Override
    public UserDTO getUser(String email) throws UserException {
        return userRepository.findByEmail(email).orElseThrow(() -> new UserException("USER_NOT_FOUND")).toDTO();
    }

}
