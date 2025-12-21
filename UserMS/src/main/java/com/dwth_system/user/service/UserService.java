package com.dwth_system.user.service;

import com.dwth_system.user.dto.UserDTO;
import com.dwth_system.user.exception.UserException;

public interface UserService {

    public void registerUser(UserDTO userDTO) throws UserException;

    public UserDTO loginUser(UserDTO userDTO) throws UserException;

    public UserDTO getUserById(Long id) throws UserException;

    public void updateUser(UserDTO userDTO) throws UserException;

    public UserDTO getUser(String email) throws UserException;

}
