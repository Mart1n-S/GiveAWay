import {
  ConflictException,
  Logger,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { RegisterDto, LoginDto } from '@repo/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  // ----------------------------------------------------------------
  // INSCRIPTION (REGISTER)
  // ----------------------------------------------------------------
  async register(dto: RegisterDto) {
    // 1. Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // 2. Hasher le mot de passe (Bcrypt pour la sécurité maximale)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // 3. Générer le token de vérification d'email
    // On génère une chaîne aléatoire (C'est celle-ci qu'on enverra par email)
    const rawToken = crypto.randomBytes(32).toString('hex');

    // On la hashe en SHA-256 pour la stocker en base (Sécurité en cas de fuite de BDD)
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // 4. Création du User (Mapping explicite pour éviter les erreurs de types)
    // On ne stocke pas 'acceptTerms' (boolean), Prisma mettra la date automatiquement via @default(now())
    await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        age: dto.age,
        biography: dto.biography,
        profilePicture: dto.profilePicture,
        password: hashedPassword,

        // Gestion de la validation email
        verificationToken: hashedToken,
        emailVerifiedAt: null, // Explicitement non vérifié au début

        // Création de l'adresse liée via la relation Prisma
        address: {
          create: {
            street: dto.address.street,
            postalCode: dto.address.postalCode,
            city: dto.address.city,
            latitude: dto.address.latitude,
            longitude: dto.address.longitude,
          },
        },
      },
    });

    // 5. Simulation envoi Email
    await this.mailService.sendVerificationEmail(dto.email, rawToken);

    // 6. On ne renvoie PAS de token JWT. On renvoie un message de succès.
    return {
      message:
        'Inscription réussie ! Veuillez vérifier vos emails pour activer votre compte.',
    };
  }

  // ----------------------------------------------------------------
  // VÉRIFICATION EMAIL
  // ----------------------------------------------------------------
  async verifyEmail(token: string) {
    // 1. On hashe le token reçu pour le comparer à celui en base
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. On cherche un utilisateur avec ce token
    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: hashedToken,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Lien de validation invalide ou expiré.');
    }

    // 3. On valide l'email et on supprime le token (pour qu'il ne serve qu'une fois)
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(), // Date de maintenant
        verificationToken: null,
        status: UserStatus.active,
      },
    });

    return {
      message:
        'Email validé avec succès ! Vous pouvez maintenant vous connecter.',
    };
  }

  // ----------------------------------------------------------------
  // LOGIN
  // ----------------------------------------------------------------
  async login(dto: LoginDto) {
    // 1. Chercher l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 2. Vérifier si l'email a été validé
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Veuillez valider votre email avant de vous connecter',
      );
    }

    // 3. Vérifier le mot de passe
    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      // 2. On loggue l'échec (Super utile pour fail2ban ou le débug)
      this.logger.warn(
        `Tentative de connexion échouée pour l'email : ${dto.email}`,
      );
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 4. Générer le token JWT
    return this.generateToken(user.id, user.email);
  }

  // --- HELPER JWT ---
  private async generateToken(userId: number, email: string) {
    const payload = { sub: userId, email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
