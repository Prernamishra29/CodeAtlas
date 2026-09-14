import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class ChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  question!: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string | null;
}
