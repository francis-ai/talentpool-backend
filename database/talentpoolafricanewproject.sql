-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 21, 2025 at 02:03 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `talentpoolafricanewproject`
--

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` int(11) NOT NULL,
  `title` varchar(500) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`id`, `title`, `content`, `created_at`) VALUES
(3, 'one', 'aweihioawewerio', '2025-08-19 19:57:01');

-- --------------------------------------------------------

--
-- Table structure for table `authentication`
--

CREATE TABLE `authentication` (
  `id` int(11) NOT NULL,
  `name` varchar(500) NOT NULL,
  `email` varchar(500) NOT NULL,
  `password` varchar(500) NOT NULL,
  `role` enum('student','admin') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `authentication`
--

INSERT INTO `authentication` (`id`, `name`, `email`, `password`, `role`, `created_at`) VALUES
(1, '', '', '', '', '2025-08-14 05:11:15'),
(3, 'Admin User', 'admin@example.com', '$2b$10$GgWbKTQTGPaZRlqchUsdAOzbxcY0CMIsQicR0OCsqGoytmGihoIPW', 'admin', '2025-08-14 06:13:54'),
(76, 'tosinogungbe706@gmail.com', 'tosinogungbe706@gmail.com', '$2b$10$E0s8OkVRr8KlIxELGcXXSOfxlBlMozPktx50Ei/i/MI2rAoU.IpOW', 'admin', '2025-08-17 08:02:00'),
(80, 'Ogungbe Wilfred Olufeyemi', 'ogungbewilfred@gmail.com', '$2b$10$7TKz3NMQHUik5JPoqQ1stu7V8J4aRSk9kekg61rIJ06dgEpgNkAuu', 'student', '2025-08-17 21:22:28'),
(81, 'sa.ogungbe@gmail.com', 'sa.ogungbe@gmail.com', '$2b$10$kdrirnaN69oQt8grFw5A5uuSzFyoLZWlOs3UzuL9F.OXsMfU14REW', 'student', '2025-08-17 21:52:52'),
(82, 'principal@school.com', 'principal@school.com', '$2b$10$2zdsndIDe1dkat3uxXu5w.089ZoUfTEbnSWK2KfpZ/dm4jAheQHnO', 'admin', '2025-08-18 10:54:02'),
(84, 'Wilson Ogungbe', 'ogungbewilson22@gmail.com', '$2b$10$9.C112C8mcio5UmaedUJw.9.pV3zs3Sf6SjNcL42cDyEn5dKmCyjO', 'student', '2025-08-20 14:56:52');

-- --------------------------------------------------------

--
-- Table structure for table `createcourse`
--

CREATE TABLE `createcourse` (
  `id` int(11) NOT NULL,
  `title` varchar(500) NOT NULL,
  `description` text NOT NULL,
  `price` decimal(10,0) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `image_url` varchar(500) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `createcourse`
--

INSERT INTO `createcourse` (`id`, `title`, `description`, `price`, `created_at`, `image_url`) VALUES
(31, 'Cybersecurity', 'Master the world of cybersecurity from fundamentals to advanced penetration testing.\r\n', 900000, '2025-08-19 12:00:27', '/uploads/1755604827556.jpeg'),
(33, 'ffh', '6r', 900, '2025-08-20 03:34:24', '/uploads/1755660864030.jpg'),
(34, 'FASHION', 'ShshNOW', 9000, '2025-08-20 14:46:39', '/uploads/1755701199191.avif');

-- --------------------------------------------------------

--
-- Table structure for table `createlessons`
--

CREATE TABLE `createlessons` (
  `id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `title` varchar(500) NOT NULL,
  `video_url` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `createlessons`
--

INSERT INTO `createlessons` (`id`, `module_id`, `title`, `video_url`, `created_at`) VALUES
(13, 12, 'Introduction to Penetration Testing', 'https://youtu.be/B7tTQ272OHE?si=bf2MpikD_Wh8Kx6p', '2025-08-19 12:17:54'),
(14, 13, 'Focuses on securing computer networks, covering firewalls, IDS/IPS, VPNs, and secure communication protocols.', 'https://youtu.be/l7FeR1MIRFY?si=Y_f-ur6N5Hh83C1T', '2025-08-19 12:17:54'),
(15, 14, 'eaches how to secure cloud infrastructures (AWS, Azure, GCP) with a focus on identity management, compliance, and monitoring.', 'https://youtu.be/0z8Smga93as?si=P-A4HYHuxjA135lv', '2025-08-19 12:17:54');

-- --------------------------------------------------------

--
-- Table structure for table `createmodule`
--

CREATE TABLE `createmodule` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `title` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `createmodule`
--

INSERT INTO `createmodule` (`id`, `course_id`, `title`, `created_at`) VALUES
(1, 10, 'qw', '2025-08-17 22:44:36'),
(2, 3, 'qwhgqwgh', '2025-08-17 22:48:52'),
(3, 3, 'ewhjwewejh', '2025-08-17 23:33:30'),
(4, 3, '2378278q387', '2025-08-17 23:33:31'),
(5, 26, 'introduction to React', '2025-08-17 23:39:01'),
(6, 10, 'Introduction to cyber security', '2025-08-18 08:40:27'),
(7, 10, 'What is penetration testing', '2025-08-18 08:40:28'),
(8, 3, 'quyqwyuyuqw', '2025-08-18 11:25:16'),
(9, 3, 'One', '2025-08-18 11:27:45'),
(10, 3, 'wwqyu', '2025-08-18 17:53:49'),
(11, 4, 'one', '2025-08-19 10:16:15'),
(12, 31, 'Ethical Hacking & Penetration Testing', '2025-08-19 12:17:54'),
(13, 31, 'Network Security', '2025-08-19 12:17:54'),
(14, 31, 'Cloud Security', '2025-08-19 12:17:54'),
(15, 31, 'aiuwqui', '2025-08-20 03:09:26');

-- --------------------------------------------------------

--
-- Table structure for table `enrollments`
--

CREATE TABLE `enrollments` (
  `id` int(11) NOT NULL,
  `user_email` varchar(500) NOT NULL,
  `course_id` int(11) NOT NULL,
  `paid` tinyint(1) NOT NULL,
  `paid_at` datetime NOT NULL,
  `reference` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `enrollments`
--

INSERT INTO `enrollments` (`id`, `user_email`, `course_id`, `paid`, `paid_at`, `reference`) VALUES
(1, 'tosinogungbe706@gmail.com', 3, 0, '0000-00-00 00:00:00', 'khlkrd3ul0'),
(2, 'tosinogungbe706@gmail.com', 5, 1, '2025-08-19 12:02:12', 'jpamqm98y5'),
(3, 'tosinogungbe706@gmail.com', 5, 1, '2025-08-19 12:02:12', 'jpamqm98y5'),
(4, 'tosinogungbe706@gmail.com', 11, 0, '0000-00-00 00:00:00', 'ffmvqrgv9d'),
(5, 'tosinogungbe706@gmail.com', 10, 0, '0000-00-00 00:00:00', '60cqr8inpx'),
(6, 'tosinogungbe706@gmail.com', 3, 0, '0000-00-00 00:00:00', 'rye6k2ystm'),
(7, 'tosinogungbe706@gmail.com', 3, 0, '0000-00-00 00:00:00', '1l9y79eing'),
(8, 'ogungbewilfred@gmail.com', 3, 1, '2025-08-18 14:36:10', 'yugrdjgyts'),
(9, 'ogungbewilfred@gmail.com', 3, 1, '2025-08-18 14:36:33', 'mwggj9uxj8'),
(10, 'tosinogungbe706@gmail.com', 3, 0, '0000-00-00 00:00:00', '4uyvmp31xo'),
(11, 'tosinogungbe706@gmail.com', 3, 1, '2025-08-18 16:28:55', '1jsdfl8oij'),
(12, 'tosinogungbe706@gmail.com', 4, 0, '0000-00-00 00:00:00', 'bw3x5h41js'),
(13, 'tosinogungbe706@gmail.com', 3, 0, '0000-00-00 00:00:00', 'dn90qafau6'),
(14, 'tosinogungbe706@gmail.com', 3, 1, '2025-08-18 16:57:26', '4or2trmmps'),
(15, 'tosinogungbe706@gmail.com', 10, 1, '2025-08-18 17:00:20', 'cz7n6kizgh'),
(16, 'tosinogungbe706@gmail.com', 25, 0, '0000-00-00 00:00:00', 'v0nhzewxgu'),
(17, 'sa.ogungbe@gmail.com', 3, 1, '2025-08-18 17:30:15', 'z4jrcte70p'),
(18, 'sa.ogungbe@gmail.com', 26, 0, '0000-00-00 00:00:00', 'kpxcfl6vwv'),
(19, 'sa.ogungbe@gmail.com', 4, 0, '0000-00-00 00:00:00', 'vs3236bizx'),
(20, 'tosinogungbe706@gmail.com', 31, 1, '2025-08-19 13:18:15', '7mp1tqcgc9'),
(21, 'ogungbewilfred@gmail.com', 31, 1, '2025-08-19 15:05:16', '4jx9uo4cuw');

-- --------------------------------------------------------

--
-- Table structure for table `hiretalent`
--

CREATE TABLE `hiretalent` (
  `id` int(11) NOT NULL,
  `course` varchar(500) NOT NULL,
  `full_name` varchar(500) NOT NULL,
  `email` varchar(500) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `dob` date NOT NULL,
  `address` text NOT NULL,
  `city` text NOT NULL,
  `qualification` varchar(50) NOT NULL,
  `experience` int(11) NOT NULL,
  `linkedIn` varchar(500) NOT NULL,
  `schedule` varchar(500) NOT NULL,
  `duration` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hiretalent`
--

INSERT INTO `hiretalent` (`id`, `course`, `full_name`, `email`, `phone`, `dob`, `address`, `city`, `qualification`, `experience`, `linkedIn`, `schedule`, `duration`, `created_at`) VALUES
(1, '', '', '', '', '0000-00-00', '', '', '', 0, '', '', '', '2025-08-12 11:22:41'),
(2, '', '', '', '', '0000-00-00', '', '', '', 0, '', '', '', '2025-08-12 11:23:00'),
(3, '', '', '', '', '0000-00-00', '', '', '', 0, '', '', '', '2025-08-12 13:10:41'),
(4, '', '', '', '', '0000-00-00', '', '', '', 0, '', '', '', '2025-08-12 13:34:14'),
(5, '', '', '', '', '0000-00-00', '', '', '', 0, '', '', '', '2025-08-12 14:32:09');

-- --------------------------------------------------------

--
-- Table structure for table `internships`
--

CREATE TABLE `internships` (
  `id` int(11) NOT NULL,
  `companyName` varchar(500) NOT NULL,
  `email` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `amount` decimal(10,0) NOT NULL,
  `salaryRange` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lessonprogress`
--

CREATE TABLE `lessonprogress` (
  `id` int(11) NOT NULL,
  `user_email` varchar(500) NOT NULL,
  `lesson_id` int(11) NOT NULL,
  `completed` tinyint(4) NOT NULL,
  `completed_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `password_resets`
--

INSERT INTO `password_resets` (`id`, `email`, `token`, `expires_at`) VALUES
(1, 'tosinogungbe706@gmail.com', '460c1e9b-1fde-47ea-9847-3c553e569ed7', '2025-08-16 00:00:00'),
(2, 'tosinogungbe706@gmail.com', '92e65eb7-c2ba-44a1-a61b-29bef7fd9ec6', '2025-08-16 00:00:00'),
(3, 'tosinogungbe706@gmail.com', '5464103f-82ca-4443-953c-386b149148fa', '2025-08-17 00:00:00'),
(4, 'tosinogungbe706@gmail.com', '8805d5a3-aca7-44ee-82d2-fa374f704cd9', '2025-08-17 00:00:00'),
(5, 'sa.ogungbe@gmail.com', '1a750c80-7fea-44dd-9779-516d18356872', '2025-08-17 00:00:00'),
(8, 'ogungbewilson22@gmail.com', '825c0b89-0478-425e-9820-98d0f8626870', '2025-08-17 18:30:45'),
(9, 'ogungbewilfred@gmail.com', '66e73418-fc4b-4320-b4ea-211e34f81c17', '2025-08-17 21:08:30'),
(10, 'ogungbewilfred@gmail.com', 'acef74b7-b953-43b3-af81-ee1064d1f257', '2025-08-19 18:39:33'),
(11, 'ogungbewilson22@gmail.com', 'a4cf9851-42bc-492a-a684-7dc6b36f4e47', '2025-08-20 16:58:09'),
(12, 'ogungbewilson22@gmail.com', '67268af0-932c-45c6-9527-fb864a3f63ff', '2025-08-20 16:58:17'),
(13, 'ogungbewilson22@gmail.com', '13cac839-548f-4e58-90fa-45aea9facd96', '2025-08-20 16:58:37');

-- --------------------------------------------------------

--
-- Table structure for table `refresh_tokens`
--

CREATE TABLE `refresh_tokens` (
  `id` int(11) NOT NULL,
  `token` varchar(500) NOT NULL,
  `email` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `refresh_tokens`
--

INSERT INTO `refresh_tokens` (`id`, `token`, `email`, `created_at`) VALUES
(1, '', '', '2025-08-14 06:00:48'),
(2, '8ca01e93-8daa-4052-8dea-0cb590b0069c', 'student1@example.com', '2025-08-14 06:11:35'),
(3, '3440eaaa-37aa-451e-aa35-cb19bee63a60', 'admin@example.com', '2025-08-14 06:14:29'),
(4, '11201cbc-e74c-4abb-ba3c-df856e38bf78', 'samuel2001@gmail.com', '2025-08-14 17:22:11'),
(5, '10ee5765-bac0-4358-a945-643fc084485b', 'samuel2001@gmail.com', '2025-08-14 17:25:26'),
(6, '7e726b13-1df2-462b-9256-21f46674c0da', 'tosinogungbe708@gmail.com', '2025-08-14 17:53:08'),
(7, '011bcddd-8a82-4bba-9710-944c544949f2', 'tosinogungbe708@gmail.com', '2025-08-14 18:01:25'),
(8, 'd58a24c5-6aba-4cff-a958-f098a10f51a6', 'admin@example.com', '2025-08-14 18:41:57'),
(9, 'd901be80-4eff-4936-bf2a-c5bcc6f284d8', 'admin@example.com', '2025-08-14 18:43:03'),
(10, 'f3308d3a-6be3-4a4f-bacd-2485f608994d', 'admin@example.com', '2025-08-14 18:43:42'),
(11, 'b8fd2255-3848-454b-9698-b187afb491b6', 'tosinogungbe708@gmail.com', '2025-08-14 18:44:11'),
(12, 'f3fec9a7-5d3e-4265-bb04-f731511a0cdf', 'tosinogungbe708@gmail.com', '2025-08-14 18:44:41'),
(13, 'c3bf1798-9b76-4d3a-8364-c0a1abd9cb65', 'admin@example.com', '2025-08-14 18:49:19'),
(14, 'fddb454e-efcc-49c6-b35e-f630915add14', 'admin@example.com', '2025-08-14 18:50:59'),
(15, '617488eb-a138-48bd-94db-2752c125781a', 'tosinogungbe708@gmail.com', '2025-08-14 18:53:51'),
(16, '794ce7ca-aa19-4ec9-86dd-333cf94c2894', 'admin@example.com', '2025-08-15 08:48:40'),
(17, '61b5e337-2edd-43f9-9004-ecbe82f41f83', 'admin@example.com', '2025-08-15 10:41:41'),
(18, '015dbfc4-6d13-4d44-bb39-bf1833735551', 'admin@example.com', '2025-08-15 10:44:53'),
(19, '0f6ba4a4-3704-49c1-b4a6-05f31b304cec', 'admin@example.com', '2025-08-15 10:45:56'),
(20, '6ef2290d-3eb2-401c-8d53-6220bec35024', 'admin@example.com', '2025-08-15 16:06:00'),
(21, '297831f4-7593-405c-b6fd-123809de0e33', 'admin@example.com', '2025-08-15 16:06:49'),
(22, 'b72e69db-0f19-4758-9279-1bb6bdbb8f0b', 'admin@example.com', '2025-08-15 16:08:03'),
(23, '79fb22e1-9537-46eb-a5f4-e926e560f513', 'tosinogungbe706@gmail.com', '2025-08-17 11:47:51'),
(24, 'afa77d69-19b1-40e8-a94a-7fbe92f364f2', 'sa.ogungbe@gmail.com', '2025-08-17 11:57:15'),
(25, 'cbf6a00c-9868-4970-8788-db2e5dc85e9d', 'principal@school.com', '2025-08-18 10:54:18'),
(26, 'e91c5cd3-f4a5-4fe2-85da-c0910dab972a', 'tosinogungbe706@gmail.com', '2025-08-18 10:54:58'),
(27, 'c53972ec-66d9-4994-97a8-4608dfa9fbe6', 'principal@school.com', '2025-08-18 10:56:38'),
(28, '085e0caf-8172-4831-bbd7-50a9e1cf5bc5', 'principal@school.com', '2025-08-18 11:10:29'),
(29, 'eb89d657-3327-4913-a886-d22156083488', 'tosinogungbe706@gmail.com', '2025-08-18 11:26:00'),
(30, 'd98220ff-1410-4694-a353-20d84dee2b72', 'principal@school.com', '2025-08-18 11:27:21'),
(31, 'a02532ac-7e33-4c96-9b71-95eb7a061ae4', 'tosinogungbe706@gmail.com', '2025-08-18 12:33:24'),
(32, '475a7d8d-8bfd-497d-8257-c57a6b0776b5', 'ogungbewilfred@gmail.com', '2025-08-18 13:09:08'),
(33, 'c8930597-2f76-4fd7-9a27-3b707482a972', 'tosinogungbe706@gmail.com', '2025-08-18 15:28:29'),
(34, 'a6e40f0f-b794-44b3-b36c-e156b22a0709', 'tosinogungbe706@gmail.com', '2025-08-18 16:06:44'),
(35, '18b5bee3-00e8-4eb1-9422-cffe49a4c8f5', 'tosinogungbe706@gmail.com', '2025-08-18 16:22:59'),
(36, '4eea6608-71cb-4b67-9a24-b67f86b32c3a', 'sa.ogungbe@gmail.com', '2025-08-18 16:28:15'),
(37, '0e77609e-60bc-4c08-8613-80fc41700cf7', 'principal@school.com', '2025-08-18 17:53:08'),
(38, '8c66165f-0d0c-4656-b0fe-1c305ce4c3f1', 'principal@school.com', '2025-08-18 18:20:52'),
(39, 'c09541d7-a7e2-4aab-afe1-0fbf413fb168', 'principal@school.com', '2025-08-18 18:46:23'),
(40, '7be1447b-4196-4cbe-923d-28ec3b30ea31', 'principal@school.com', '2025-08-18 19:14:10'),
(41, '87f3a853-7ece-497f-bab8-f9025c3b1c3f', 'tosinogungbe706@gmail.com', '2025-08-18 20:20:46'),
(42, '0a22d009-4a9a-4420-b8a1-46ba0c020f55', 'tosinogungbe706@gmail.com', '2025-08-19 08:00:47'),
(43, '1eeca168-5dc4-4e44-bf66-376b45d2c385', 'tosinogungbe706@gmail.com', '2025-08-19 09:18:53'),
(44, 'bcfc875e-5766-4410-9609-218a94583796', 'tosinogungbe706@gmail.com', '2025-08-19 10:19:23'),
(45, '092c4c05-3dfe-4a65-8233-5e072cd0ac14', 'principal@school.com', '2025-08-19 10:20:23'),
(46, 'b36c7e36-eb5b-40bc-a013-a1dffda9e583', 'tosinogungbe706@gmail.com', '2025-08-19 10:59:52'),
(47, 'b9cd9f09-3283-4b95-b782-7cabe3f6c872', 'tosinogungbe706@gmail.com', '2025-08-19 11:22:57'),
(48, 'f1a24afe-6d26-44a0-a570-28642511cf07', 'sa.ogungbe@gmail.com', '2025-08-19 11:26:49'),
(49, 'db878560-17fa-41c5-b5f3-c9f06d1420e9', 'tosinogungbe706@gmail.com', '2025-08-19 11:28:16'),
(50, '8806b1b8-8480-47f1-8e6a-a1ebb32629bc', 'tosinogungbe706@gmail.com', '2025-08-19 12:31:40'),
(51, 'd3d96fa4-2c08-4e69-8949-03c4331c04ef', 'tosinogungbe706@gmail.com', '2025-08-19 13:49:09'),
(52, '0f9fbf84-ccdf-41a7-8a72-31dc227e928e', 'ogungbewilfred@gmail.com', '2025-08-19 14:04:47'),
(53, '85852d0f-bfa3-4ec6-b4cc-3ab3d94c9cf8', 'ogungbewilfred@gmail.com', '2025-08-19 17:02:03'),
(56, '5678ab05-88b2-40f5-83b0-f80b1667ccf2', 'ogungbewilfred@gmail.com', '2025-08-19 18:14:41'),
(57, '566a1373-e26e-401c-8241-f6180fd2182a', 'ogungbewilfred@gmail.com', '2025-08-19 18:15:49'),
(58, 'f75f4eaa-6b82-498d-93f6-a3b8c166b014', 'tosinogungbe706@gmail.com', '2025-08-19 19:19:58'),
(59, '22d40f74-d825-40f6-8bec-6da99b5be442', 'tosinogungbe706@gmail.com', '2025-08-19 19:54:10'),
(61, '32f5c2e7-c0f0-4aec-9359-18e4879535e1', 'tosinogungbe706@gmail.com', '2025-08-19 19:56:50'),
(63, 'e1417b4a-7706-44f8-a359-ccb051c786c7', 'ogungbewilfred@gmail.com', '2025-08-19 21:00:24'),
(64, '255e4474-9feb-48ee-a1a6-e34d43ba433e', 'ogungbewilfred@gmail.com', '2025-08-20 00:19:26'),
(66, 'c125ef2e-f0ac-4c0c-9125-42b392a063f4', 'ogungbewilfred@gmail.com', '2025-08-20 02:14:41'),
(67, '87573ec9-3157-431f-b8fe-d49b527ae8d0', 'tosinogungbe706@gmail.com', '2025-08-20 02:41:37'),
(68, 'dc473ca5-8a6d-4316-9649-2ba18bd98b56', 'tosinogungbe706@gmail.com', '2025-08-20 03:33:37'),
(70, '7c78c51b-4fc2-4016-b501-628e808552f9', 'tosinogungbe706@gmail.com', '2025-08-20 10:54:51'),
(71, 'a1e96644-52b8-4b97-9c9c-dd36b9985f27', 'sa.ogungbe@gmail.com', '2025-08-20 10:58:50'),
(72, 'ffa91c30-7822-4366-9408-a16d1b7f8fa3', 'tosinogungbe706@gmail.com', '2025-08-20 11:24:20'),
(73, 'aab91818-5a67-4587-9398-c4c83a3445ac', 'tosinogungbe706@gmail.com', '2025-08-20 11:29:38'),
(74, '26319742-2e1f-47b4-b1d6-585875747e3a', 'tosinogungbe706@gmail.com', '2025-08-20 14:12:17'),
(75, 'f4622d31-aaa3-4881-85b8-6580be7bbf10', 'tosinogungbe706@gmail.com', '2025-08-20 14:46:12');

-- --------------------------------------------------------

--
-- Table structure for table `registertalent`
--

CREATE TABLE `registertalent` (
  `id` int(11) NOT NULL,
  `course` varchar(500) NOT NULL,
  `full_name` varchar(500) NOT NULL,
  `email` varchar(500) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `dob` date NOT NULL,
  `address` text NOT NULL,
  `city` text NOT NULL,
  `qualification` varchar(50) NOT NULL,
  `experience` int(11) NOT NULL,
  `linked_in` varchar(500) NOT NULL,
  `schedule` varchar(500) NOT NULL,
  `duration` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `registertalent`
--

INSERT INTO `registertalent` (`id`, `course`, `full_name`, `email`, `phone`, `dob`, `address`, `city`, `qualification`, `experience`, `linked_in`, `schedule`, `duration`, `created_at`) VALUES
(1, '', '', '', '', '0000-00-00', '', '', '', 0, '', '', '', '2025-08-12 13:50:57'),
(2, '', '', '', '', '0000-00-00', '', '', '', 0, '', '', '', '2025-08-12 13:51:25'),
(3, '', '', '', '', '0000-00-00', '', '', '', 0, '', '', '', '2025-08-12 14:01:35'),
(4, '', '', '', '', '0000-00-00', '', '', '', 0, '', '', '', '2025-08-12 14:09:25'),
(5, '', '', '', '', '0000-00-00', '', '', '', 0, '', '', '', '2025-08-12 14:25:46'),
(6, 'Frontend Development (3 months)', 'John Doe', 'john.doe@example.com', '1234567890', '1995-05-15', '123 Main St', 'Lagos', 'BSc', 3, 'https://linkedin.com/in/johndoe', 'Weekdays', '3 Hours', '2025-08-12 14:54:12'),
(7, 'Frontend Development (3 months)', 'John Doe', 'john.doe@example.com', '1234567890', '1995-05-15', '123 Main St', 'Lagos', 'BSc', 3, 'https://linkedin.com/in/johndoe', 'Weekdays', '3 Hours', '2025-08-12 14:54:52'),
(8, '', '', '', '', '0000-00-00', '', '', '', 0, '', '', '', '2025-08-12 15:32:34'),
(9, '', '', '', '', '0000-00-00', '', '', '', 0, '', '', '', '2025-08-12 16:12:34'),
(10, 'Fullstack Development (6 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '1986-07-11', 'iyana church ibadan', 'ibadan', 'PhD', 9, '', 'Weekdays', '3 Hours', '2025-08-12 16:31:45'),
(11, 'Frontend Development (3 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '2006-06-08', 'iyana church ibadan', 'ibadan', 'PhD', 9, '', 'Weekdays', '3 Hours', '2025-08-12 17:44:21'),
(12, 'Data Science / Machine Learning (6 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '2006-06-08', 'iyana church ibadan', 'ibadan', 'PhD', 9, '', 'Weekdays', '3 Hours', '2025-08-12 17:44:56'),
(13, 'Data Analysis with Python (3 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '2002-02-13', 'iyana church ibadan', 'ibadan', 'MBA', 9, '', 'Weekdays', '3 Hours', '2025-08-12 17:53:15'),
(14, 'Data Analysis with Python (3 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '1995-09-13', 'iyana church ibadan', 'ibadan', 'HND', 9, 'talentpool', 'Weekends (Sat/Sun)', '3 Hours', '2025-08-12 18:05:01'),
(15, 'Fullstack Development (6 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '1968-07-19', 'iyana church ibadan', 'ibadan', 'MSc', 9, 'talentpool', 'Weekdays', '3 Hours', '2025-08-12 18:07:39'),
(16, 'Frontend Development (3 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '2001-06-13', 'iyana church ibadan', 'ibadan', 'OND', 9, 'talentpool', 'Weekdays', '3 Hours', '2025-08-12 18:10:33'),
(17, 'Data Analysis with Python (3 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '1988-11-25', 'iyana church ibadan', 'ibadan', 'MBA', 8, 'talentpool', 'Weekdays', '3 Hours', '2025-08-12 18:26:26'),
(18, 'Data Analysis with Python (3 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '1988-11-25', 'iyana church ibadan', 'ibadan', 'MBA', 8, 'talentpool', 'Weekdays', '3 Hours', '2025-08-12 18:28:11'),
(19, 'Data Analysis with Python (3 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '2004-11-19', 'iyana church ibadan', 'ibadan', 'MBA', 9, 'talentpool', 'Weekdays', '3 Hours', '2025-08-12 18:29:37'),
(20, 'UI/UX Design (3 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '1995-10-19', 'iyana church ibadan', 'ibadan', 'MBA', 9, 'talentpool', 'Weekdays', '3 Hours', '2025-08-12 19:35:29'),
(21, 'Frontend Development (3 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '1987-07-11', 'iyana church ibadan', 'Yutuyyu', 'MBA', 9, 'talentpool', 'Weekdays', '3 Hours', '2025-08-12 19:37:58'),
(22, 'Frontend Development (3 months)', 'Oluwatosin', 'tosinogungbe708@gmail.com', '07016042032', '2005-07-15', 'iyana church ibadan', 'ibadan', 'MBA', 8, 'llll', 'Weekdays', '3 Hours', '2025-08-14 05:19:27');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `authentication`
--
ALTER TABLE `authentication`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `createcourse`
--
ALTER TABLE `createcourse`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `createlessons`
--
ALTER TABLE `createlessons`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `createmodule`
--
ALTER TABLE `createmodule`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `hiretalent`
--
ALTER TABLE `hiretalent`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `internships`
--
ALTER TABLE `internships`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `lessonprogress`
--
ALTER TABLE `lessonprogress`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `registertalent`
--
ALTER TABLE `registertalent`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `authentication`
--
ALTER TABLE `authentication`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=85;

--
-- AUTO_INCREMENT for table `createcourse`
--
ALTER TABLE `createcourse`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `createlessons`
--
ALTER TABLE `createlessons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `createmodule`
--
ALTER TABLE `createmodule`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `enrollments`
--
ALTER TABLE `enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `hiretalent`
--
ALTER TABLE `hiretalent`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `internships`
--
ALTER TABLE `internships`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `lessonprogress`
--
ALTER TABLE `lessonprogress`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `registertalent`
--
ALTER TABLE `registertalent`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
