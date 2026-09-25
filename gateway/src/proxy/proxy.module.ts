import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from '../auth/auth.module';
import { MediaProxyController } from './media-proxy.controller';

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [MediaProxyController],
})
export class ProxyModule {}
