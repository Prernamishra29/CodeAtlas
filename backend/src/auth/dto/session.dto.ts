import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class RefreshTokenDto {
  @IsString()
  @MaxLength(512)
  refreshToken!: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  refreshToken?: string;
}
