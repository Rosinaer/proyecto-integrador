import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
 
const prisma = new PrismaClient();
 
async function main() {
  console.log('🧹 Limpiando toda la base de datos...');
 
  // Orden por FK: primero hijos, después padres
  await prisma.reminderLog.deleteMany();
  await prisma.appointmentAudit.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availabilityException.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.recurringSchedule.deleteMany();
  await prisma.professionalService.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.user.deleteMany();
  await prisma.people.deleteMany();
 
  console.log('✅ Base de datos limpia. Ya podés correr seed1 y seed2.');
}
 
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
 