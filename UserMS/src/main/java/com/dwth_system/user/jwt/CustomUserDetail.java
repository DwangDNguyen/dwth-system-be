package com.dwth_system.user.jwt;

import java.util.Collection;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.dwth_system.user.utility.Roles;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CustomUserDetail implements UserDetails {

    private String id;
    private String username;
    private String email;
    private String password;
    private Roles role;
    private String name;

    private Collection<? extends GrantedAuthority> authorities;
}
