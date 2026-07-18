-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FARMER', 'CONSUMER', 'NGO', 'ADMIN');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('AVAILABLE', 'SOLD_OUT', 'REMOVED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'CLAIMED', 'FULFILLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "harvestDate" TIMESTAMP(3) NOT NULL,
    "photoUrl" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyRequest" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "needType" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NGO" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "verificationStatus" BOOLEAN NOT NULL DEFAULT false,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NGO_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NGO_userId_key" ON "NGO"("userId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NGO" ADD CONSTRAINT "NGO_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
