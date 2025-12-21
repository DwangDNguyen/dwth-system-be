package com.dwth_system.user.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.dwth_system.user.dto.LoginDTO;
import com.dwth_system.user.dto.RefreshTokenRequestDTO;
import com.dwth_system.user.dto.ResponseDTO;
import com.dwth_system.user.dto.TokenDTO;
import com.dwth_system.user.dto.UserDTO;
import com.dwth_system.user.entity.RefreshToken;
import com.dwth_system.user.exception.UserException;
import com.dwth_system.user.jwt.JwtUtils;
import com.dwth_system.user.service.RefreshTokenService;
import com.dwth_system.user.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/user")
@Validated
@CrossOrigin
public class UserAPI {

    @Autowired
    private UserService userService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @PostMapping("/register")
    public ResponseEntity<ResponseDTO> registerUser(@RequestBody @Valid UserDTO userDTO) throws UserException {
        userService.registerUser(userDTO);
        return new ResponseEntity<>(new ResponseDTO("User registered successfully"), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<TokenDTO> loginUser(@RequestBody LoginDTO loginDTO) throws UserException {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(loginDTO.getEmail(), loginDTO.getPassword()));

        } catch (AuthenticationException e) {
            throw new UserException("INVALID_CREDENTIALS");
        }

        final UserDetails userDetails = userDetailsService.loadUserByUsername(loginDTO.getEmail());
        final String accessToken = jwtUtils.generateToken(userDetails);

        // Get user ID to create refresh token
        UserDTO userDTO = userService.getUser(loginDTO.getEmail());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(userDTO.getId());

        TokenDTO tokenDTO = new TokenDTO(
                accessToken,
                refreshToken.getToken(),
                jwtUtils.getTokenValidity()
        );

        return new ResponseEntity<>(tokenDTO, HttpStatus.OK);
    }

    @GetMapping("/get-user")
    public String getUserByEmail(@RequestParam String param) {
        return new String();
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<TokenDTO> refreshToken(@RequestBody @Valid RefreshTokenRequestDTO request) throws UserException {
        String requestRefreshToken = request.getRefreshToken();

        RefreshToken refreshToken = refreshTokenService.findByToken(requestRefreshToken)
                .orElseThrow(() -> new UserException("INVALID_REFRESH_TOKEN"));

        refreshToken = refreshTokenService.verifyExpiration(refreshToken);

        UserDetails userDetails = userDetailsService.loadUserByUsername(refreshToken.getUser().getEmail());
        String newAccessToken = jwtUtils.generateToken(userDetails);

        TokenDTO tokenDTO = new TokenDTO(
                newAccessToken,
                requestRefreshToken,
                jwtUtils.getTokenValidity()
        );

        return new ResponseEntity<>(tokenDTO, HttpStatus.OK);
    }

    @GetMapping("/profile")
    public ResponseEntity<UserDTO> getProfile(@RequestHeader("Authorization") String authHeader) throws UserException {
        // Extract token from Authorization header
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UserException("INVALID_CREDENTIALS");
        }
        String token = authHeader.substring(7);

        // Get email from token
        String email = jwtUtils.getEmailFromToken(token);

        // Get user by email
        UserDTO userDTO = userService.getUser(email);

        // Remove password from response
        userDTO.setPassword(null);

        return new ResponseEntity<>(userDTO, HttpStatus.OK);
    }

}
