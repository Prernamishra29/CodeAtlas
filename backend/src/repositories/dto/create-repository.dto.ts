import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateRepositoryDto {
  @IsString()
  @MaxLength(300)
  @Matches(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?\/?$/, {
    message: "Use the form https://github.com/user/project",
  })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^(?!.*\.\.)[\w][\w./-]*$/, { message: "That branch name is not valid." })
  branch?: string;
}
