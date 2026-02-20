import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Global() // Accessible partout sans import
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
