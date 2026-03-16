export interface PlagiarismResultDTO {
  provider: string;
  similarityRate: number;
  reportUrl?: string;
}

export interface IPlagiarismAdapter {
  check(content: string): Promise<PlagiarismResultDTO>;
}
