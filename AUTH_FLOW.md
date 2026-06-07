# Authentication Flow Documentation

## Tổng quan kiến trúc

Hệ thống gồm 3 service chính:

- `api-gateway`: công khai entrypoint, kiểm tra JWT cho tất cả request `/api/v1/*` và proxy request auth tới `auth-service`.
- `auth-service`: xử lý auth, đăng ký, login, refresh token, forgot password, logout.
- `mail-service`: gửi email OTP cho đăng ký và quên mật khẩu.

`api-gateway` hiện tại proxy tất cả `/api/v1/auth` tới `http://localhost:3001`.

---

## 1. API Gateway

### 1.1 Mục đích

- Bảo vệ toàn bộ các route `/api/v1/*` bằng JWT.
- Giữ public route auth mở: `login`, `refresh-token`, `register`, `verify-otp`, `forgot-password`, `forgot-password/verify-otp`, `reset-password`.
- Forward `Authorization` header đến `auth-service`.
- Khi token hợp lệ, đính kèm thông tin user vào header proxy: `x-user-id`, `x-user-email`, `x-user-role`.

### 1.2 Cách hoạt động

File: `api-gateway/src/server.ts`

- `app.use("/api/v1", authenticate);`
    - Áp dụng middleware xác thực cho toàn bộ API.
- Middleware bỏ qua `OPTIONS` và các public path.
- Nếu request cần xác thực:
    - lấy `Authorization` header
    - verify JWT với `JWT_ACCESS_SECRET`
    - nếu thành công, gắn `req.user = { userId, email, role }`
    - nếu không, trả 401.

- Proxy route:
    - `app.use("/api/v1/auth", proxy("http://localhost:3001", {...}))`
    - giữ nguyên `authorization`
    - forward thêm headers:
        - `x-user-id`
        - `x-user-email`
        - `x-user-role`

### 1.3 Public route

Public route không cần JWT ở gateway:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh-token`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-otp`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/forgot-password/verify-otp`
- `POST /api/v1/auth/reset-password`

---

## 2. Auth Service

### 2.1 Cấu trúc và khởi động

- `auth-service/src/server.ts`: kết nối MongoDB và Redis, chạy app.
- `auth-service/src/app.ts`: cấu hình body parser, cookie parser, routes, error handlers.
- `auth-service/src/routes/auth.routes.ts`: định nghĩa các route auth.

### 2.2 Middleware authenticate

File: `auth-service/src/middlewares/authenticate.middleware.ts`

Luồng xử lý:

1. Nếu có header `x-user-id`, `x-user-email`, `x-user-role`:
    - middleware tin vào gateway đã xác thực và attach `req.user`.
2. Nếu không có headers đó:
    - fallback verify token JWT từ `Authorization: Bearer <token>`.
    - verify bằng `JWT_ACCESS_SECRET`.
    - attach `req.user` từ payload.

Nghĩa là `auth-service` có hai chế độ:

- `gateway-forwarded`: dùng header forwarded từ gateway.
- `direct call`: xác thực trực tiếp bằng JWT.

### 2.3 Route auth

File: `auth-service/src/routes/auth.routes.ts`

- `POST /register` → `register`
- `POST /verify-otp` → `verifyOtp`
- `POST /login` → `login`
- `POST /refresh-token` → `refreshToken`
- `POST /logout` → `authenticate`, `logout`
- `POST /forgot-password` → `forgotPassword`
- `POST /forgot-password/verify-otp` → `verifyFpOtp`
- `POST /reset-password` → `resetPassword`

### 2.4 Đăng ký (Register)

File: `auth-service/src/controllers/auth.controller.ts`

#### Bước 1: Người dùng gửi `POST /api/auth/register`

- Validate: fullname, email, password, role.
- Gọi `sendOtp`.

File: `auth-service/src/services/otp.service.ts`

#### Bước 2: `sendOtp` thực hiện

- Kiểm tra email chưa tồn tại trong MongoDB.
- Hash password bằng bcrypt.
- Lưu `pendingUser` vào Redis với key `pending:<email>` (TTL 10 phút).
- Sinh OTP 4 chữ số.
- Lưu OTP vào Redis với key `otp:<email>` (TTL 5 phút).
- Gọi `mail-service` qua API `POST http://localhost:5000/api/v1/send-mail`.

#### Bước 3: Người dùng xác thực OTP

- `POST /api/auth/verify-otp` với `email`, `otp`.
- `verifyOtpService` kiểm tra:
    - OTP tồn tại và đúng (`otp:<email>`).
    - `pendingUser` tồn tại.
- Nếu đúng:
    - tạo user mới trong MongoDB.
    - xóa `otp:<email>` và `pending:<email>`.
- Trả về thông tin user.

### 2.5 Quên mật khẩu (Forgot Password)

File: `auth-service/src/controllers/auth.controller.ts`

#### Bước 1: Yêu cầu OTP

- `POST /api/auth/forgot-password` với `email`.
- `sendForgotPasswordOtp`:
    - rate limit 3 lần / 15 phút.
    - kiểm tra user tồn tại.
    - gửi OTP 4 chữ số vào Redis key `fp_otp:<email>` (TTL 5 phút).
    - gửi email đến mail-service.
- Trả về cùng một message để tránh lộ thông tin email chưa đăng ký.

#### Bước 2: Xác thực OTP

- `POST /api/auth/forgot-password/verify-otp` với `email`, `otp`.
- `verifyForgotPasswordOtp`:
    - kiểm tra giới hạn sai OTP (max 5 lần trong 5 phút).
    - so sánh với `fp_otp:<email>`.
    - xóa OTP và counter sai nếu đúng.
    - tạo JWT reset token với `JWT_RESET_SECRET` và jti.
    - lưu jti vào Redis key `fp_token:<email>` (TTL 10 phút).
- Trả về `resetToken`.

#### Bước 3: Đặt lại mật khẩu

- `POST /api/auth/reset-password` với `resetToken`, `newPassword`.
- `resetPasswordService`:
    - verify JWT reset token bằng `JWT_RESET_SECRET`.
    - kiểm tra `fp_token:<email>` tồn tại và trùng jti.
    - hash password mới.
    - cập nhật password trong MongoDB.
    - xóa `fp_token:<email>` để token chỉ dùng một lần.

### 2.6 Đăng nhập (Login)

File: `auth-service/src/controllers/auth.controller.ts` và `auth-service/src/services/auth.service.ts`

#### Bước 1: `POST /api/auth/login`

- Validate email và password.
- Gọi `loginService`.

#### Bước 2: `loginService` thực hiện

- Kiểm tra brute-force lock bằng Redis key `login_attempts:<email>`.
- Tìm user trong MongoDB, kèm password hash.
- So sánh password với bcrypt, hoặc dùng `DUMMY_HASH` nếu user không tồn tại để tránh timing attack.
- Nếu sai:
    - nếu user tồn tại, tăng counter sai bằng `incrementLoginAttempts`.
    - trả lỗi `InvalidCredentialsError`.
- Nếu đúng:
    - xóa counter login failed (`deleteLoginAttempts`).
    - tạo access token JWT với `JWT_ACCESS_SECRET`.
    - tạo refresh token JWT với `JWT_REFRESH_SECRET`.
    - lưu jti của refresh token vào Redis `refresh:<userId>`.
    - trả về:
        - Access Token trong body.
        - Refresh Token sẽ được gửi bằng cookie HttpOnly.

#### Cookie refresh token

- Cookie name: `refreshToken`
- Options:
    - `httpOnly: true`
    - `secure` khi `NODE_ENV === "production"`
    - `sameSite: "strict"`
    - `path: "/api/v1/auth"`
    - `maxAge: 7 ngày`

### 2.7 Refresh Token

#### Bước: `POST /api/auth/refresh-token`

- Lấy token từ cookie `refreshToken`.
- Gọi `refreshTokenService`.

#### `refreshTokenService` xử lý

- Verify token bằng `JWT_REFRESH_SECRET`.
- Lấy `userId` và `jti` từ payload.
- So sánh với giá trị trong Redis `refresh:<userId>`:
    - nếu khác, token đã bị revoke → trả lỗi.
- Kiểm tra user trong MongoDB tồn tại.
- Tạo cặp access token + refresh token mới.
- Cập nhật Redis `refresh:<userId>` bằng jti mới.
- Trả access token mới và set cookie refresh token mới.

### 2.8 Logout

#### Bước: `POST /api/auth/logout`

- Route yêu cầu middleware `authenticate`.
- Lấy `req.user.userId`.
- Gọi `logoutService` để xóa `refresh:<userId>` khỏi Redis.
- Clear cookie refreshToken.

### 2.9 Các lỗi và response

- `ResponseHelper` gửi response thành công theo cấu trúc:
    - `success`, `statusCode`, `message`, `data`, `timestamp`.
- Lỗi custom được throw bằng các class trong `auth-service/src/utils/custom.errors.ts`:
    - `ValidationError`, `DuplicateEmailError`, `UnauthorizedError`, `OtpExpiredError`, `OtpInvalidError`, `ResetTokenInvalidError`, `InvalidCredentialsError`, `TooManyRequestsError`, ...
- Middleware `enhancedErrorHandler` xử lý error chung, lỗi Mongoose, duplicate, cast.

---

## 3. Mail Service

### 3.1 Mục đích

- Nhận request gửi mail từ auth-service.
- Gửi email OTP hoặc reset password bằng transporter Gmail.

### 3.2 Luồng

File: `mail-service/src/server.ts`

- `POST /api/v1/send-mail`
- Controller kiểm tra body gồm `email`, `subject`, `body`, `from`.
- Gọi `sendMailService`.
- `sendMailService` dùng `nodemailer` để gửi email.

### 3.3 Cấu hình

File: `mail-service/src/config/mail.config.ts`

- Dùng Gmail SMTP với `MAIL_USER` và `MAIL_PASS` từ env.

### 3.4 Dữ liệu

Interface: `mail-service/src/types/index.ts`

- `IMailData` gồm `email`, `subject`, `body`, `from`.

---

## 4. Redis và MongoDB trong hệ thống

### Redis dùng cho

- OTP đăng ký: `otp:<email>`
- Pending registration user: `pending:<email>`
- OTP forgot password: `fp_otp:<email>`
- Reset token single-use: `fp_token:<email>`
- Forgot password attempt limit: `fp_attempts:<email>`
- Forgot password rate limit: `fp_ratelimit:<email>`
- Refresh token session single-session: `refresh:<userId>`
- Login brute-force delay: `login_attempts:<email>`

### MongoDB dùng cho

- Lưu thông tin `User` vào collection.
- `User` schema: `fullname`, `email`, `password`, `role`.

---

## 5. Secrets và biến môi trường quan trọng

### Auth service

- `PORT`
- `MONGODB_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_RESET_SECRET`
- `NODE_ENV`

### Gateway

- `PORT`
- `ALLOWED_ORIGINS`
- `JWT_ACCESS_SECRET` (phải trùng với auth-service)

### Mail service

- `PORT`
- `MAIL_USER`
- `MAIL_PASS`

---

## 6. Tổng hợp luồng từng chức năng

### 6.1 Đăng ký (register)

1. Client gọi `POST /api/v1/auth/register` đến `api-gateway`.
2. `api-gateway` nhận request và không yêu cầu JWT cho route này.
3. Gateway proxy request đến `auth-service`.
4. `auth-service` gọi `sendOtp`:
    - hash password
    - lưu pending user + OTP vào Redis
    - gọi `mail-service` gửi email OTP
5. User nhận OTP, gọi `POST /api/v1/auth/verify-otp`.
6. `auth-service` kiểm tra OTP và pending user, tạo tài khoản MongoDB.
7. Trả về thông tin user.

### 6.2 Đăng nhập (login)

1. Client gọi `POST /api/v1/auth/login`.
2. Gateway proxy request đến auth-service mà không cần JWT.
3. `auth-service` kiểm tra brute-force, xác thực password.
4. Nếu thành công:
    - tạo `accessToken` JWT
    - tạo `refreshToken` JWT
    - lưu refresh token jti vào Redis
    - trả access token trong body
    - gửi refresh token qua HttpOnly cookie

### 6.3 Refresh access token

1. Client gọi `POST /api/v1/auth/refresh-token`.
2. Gateway proxy request đến auth-service.
3. `auth-service` đọc cookie `refreshToken`.
4. Verify refresh JWT + kiểm tra jti với Redis.
5. Tạo cặp token mới, cập nhật Redis, trả access token mới và cookie refresh mới.

### 6.4 Logout

1. Client gọi `POST /api/v1/auth/logout`.
2. Gateway xác thực JWT nếu route không public và forward user headers.
3. Auth-service middleware attach `req.user`.
4. `logout` controller xóa refresh session trong Redis và clear cookie.

### 6.5 Quên mật khẩu (forgot password)

1. Client gọi `POST /api/v1/auth/forgot-password`.
2. `auth-service` tạo OTP và gửi mail qua mail-service.
3. User nhập OTP, gọi `POST /api/v1/auth/forgot-password/verify-otp`.
4. `auth-service` xác thực OTP, tạo reset JWT token, lưu jti vào Redis.
5. User dùng `resetToken` gọi `POST /api/v1/auth/reset-password` với mật khẩu mới.
6. `auth-service` verify reset token và jti, cập nhật mật khẩu, revoke token.

---

## 7. Ghi chú thực tế

- `auth-service` vẫn giữ middleware `authenticate` cho route logout và direct service call.
- `api-gateway` là điểm bảo mật chung, nhưng auth-service vẫn có thể verify token khi gateway không cung cấp header forwarded.
- Cấu hình secret phải đồng bộ giữa gateway và auth-service để JWT verification khớp.
- Trong production, nên dùng secure network / service mesh để tránh header spoofing giữa gateway và backend.

---

## 8. Kiểm tra nhanh

- `api-gateway` proxy `/api/v1/auth/*`.
- `auth-service` routes được khai báo bằng `authRoutes` và mount ở `/`.
- `mail-service` nhận email bằng endpoint `/api/v1/send-mail`.

---

## 9. Tài liệu hữu ích

- `api-gateway/src/server.ts`
- `api-gateway/src/middlewares/authenticate.middleware.ts`
- `auth-service/src/controllers/auth.controller.ts`
- `auth-service/src/services/auth.service.ts`
- `auth-service/src/services/otp.service.ts`
- `auth-service/src/services/forgot-password.service.ts`
- `auth-service/src/services/otp.cache.ts`
- `mail-service/src/services/mail.service.ts`
