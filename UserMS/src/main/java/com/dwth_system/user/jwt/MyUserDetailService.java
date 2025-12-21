package com.dwth_system.user.jwt;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.dwth_system.user.dto.UserDTO;
import com.dwth_system.user.exception.UserException;
import com.dwth_system.user.service.UserService;

@Service
public class MyUserDetailService implements UserDetailsService {

    @Autowired
    private UserService userService;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        try {
            UserDTO dto = userService.getUser(email);
            return new CustomUserDetail(dto.getId(), dto.getEmail(), dto.getEmail(), dto.getPassword(), dto.getRole(), dto.getName(), null);
        } catch (UserException e) {
            e.printStackTrace();
        }
        return null;
    }

}
