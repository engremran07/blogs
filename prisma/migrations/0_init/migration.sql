-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUBSCRIBER', 'CONTRIBUTOR', 'AUTHOR', 'EDITOR', 'ADMINISTRATOR', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SeriesStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SeoSuggestionCategory" AS ENUM ('META', 'CONTENT', 'TECHNICAL', 'IMAGE', 'LINKING', 'STRUCTURED_DATA', 'SOCIAL', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "SeoSuggestionSource" AS ENUM ('AUDIT', 'AI', 'MANUAL', 'RULE_ENGINE');

-- CreateEnum
CREATE TYPE "SeoSuggestionStatus" AS ENUM ('NEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'APPLIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SeoTargetType" AS ENUM ('POST', 'PAGE', 'CATEGORY', 'TAG', 'SITE');

-- CreateEnum
CREATE TYPE "SeoKeywordIntent" AS ENUM ('INFORMATIONAL', 'COMMERCIAL', 'TRANSACTIONAL', 'LOCAL', 'NAVIGATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SeoEntityType" AS ENUM ('CATEGORY', 'TAG', 'AUTO_TAG', 'TOPIC', 'BRAND', 'PERSON', 'LOCATION');

-- CreateEnum
CREATE TYPE "SeoEntityRelation" AS ENUM ('CO_OCCURRENCE', 'HIERARCHY', 'SYNONYM', 'RELATED', 'PARENT_CHILD');

-- CreateEnum
CREATE TYPE "BatchOperationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "nickname" TEXT,
    "displayName" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "language" TEXT,
    "website" TEXT,
    "phoneNumber" TEXT,
    "countryCode" TEXT,
    "alternateEmail" TEXT,
    "whatsapp" TEXT,
    "fax" TEXT,
    "facebook" TEXT,
    "twitter" TEXT,
    "instagram" TEXT,
    "linkedin" TEXT,
    "youtube" TEXT,
    "tiktok" TEXT,
    "telegram" TEXT,
    "github" TEXT,
    "pinterest" TEXT,
    "snapchat" TEXT,
    "bio" TEXT,
    "company" TEXT,
    "jobTitle" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'SUBSCRIBER',
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_change_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldEmail" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "oldEmailCode" TEXT NOT NULL,
    "newEmailCode" TEXT NOT NULL,
    "oldEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "newEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "adminApproved" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "loginEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultRole" "UserRole" NOT NULL DEFAULT 'SUBSCRIBER',
    "requireCaptchaOnLogin" BOOLEAN NOT NULL DEFAULT false,
    "requireCaptchaOnRegister" BOOLEAN NOT NULL DEFAULT false,
    "requireCaptchaOnPasswordReset" BOOLEAN NOT NULL DEFAULT false,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 12,
    "passwordMaxLength" INTEGER NOT NULL DEFAULT 128,
    "passwordRequireUppercase" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireLowercase" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireDigit" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireSpecialChar" BOOLEAN NOT NULL DEFAULT true,
    "maxLoginAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockoutDurationMs" INTEGER NOT NULL DEFAULT 900000,
    "accessTokenExpiryMs" INTEGER NOT NULL DEFAULT 900000,
    "refreshTokenExpiryMs" INTEGER NOT NULL DEFAULT 604800000,
    "maxActiveSessions" INTEGER NOT NULL DEFAULT 10,
    "requireEmailVerification" BOOLEAN NOT NULL DEFAULT true,
    "emailVerificationExpiryMs" INTEGER NOT NULL DEFAULT 86400000,
    "emailVerificationCodeLength" INTEGER NOT NULL DEFAULT 6,
    "passwordResetExpiryMs" INTEGER NOT NULL DEFAULT 3600000,
    "emailChangeExpiryMs" INTEGER NOT NULL DEFAULT 86400000,
    "emailChangeRequiresAdminApproval" BOOLEAN NOT NULL DEFAULT true,
    "bcryptRounds" INTEGER NOT NULL DEFAULT 12,
    "csrfEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cookieSecure" BOOLEAN NOT NULL DEFAULT true,
    "cookieSameSite" TEXT NOT NULL DEFAULT 'lax',
    "cookieDomain" TEXT NOT NULL DEFAULT '',
    "enableSocialLinks" BOOLEAN NOT NULL DEFAULT true,
    "enablePhoneNumber" BOOLEAN NOT NULL DEFAULT true,
    "enableContactInfo" BOOLEAN NOT NULL DEFAULT true,
    "enableNickname" BOOLEAN NOT NULL DEFAULT true,
    "enableDisplayNameChoice" BOOLEAN NOT NULL DEFAULT true,
    "allowSelfDeletion" BOOLEAN NOT NULL DEFAULT false,
    "allowPasswordChange" BOOLEAN NOT NULL DEFAULT true,
    "allowUsernameChange" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "featuredImage" TEXT,
    "featuredImageAlt" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterImage" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "twitterCard" TEXT,
    "autoTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "noIndex" BOOLEAN NOT NULL DEFAULT false,
    "noFollow" BOOLEAN NOT NULL DEFAULT false,
    "structuredData" JSONB,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "readingTime" INTEGER NOT NULL DEFAULT 1,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinOrder" INTEGER NOT NULL DEFAULT 0,
    "password" TEXT,
    "allowComments" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "isGuestPost" BOOLEAN NOT NULL DEFAULT false,
    "guestAuthorName" TEXT,
    "guestAuthorEmail" TEXT,
    "guestAuthorBio" TEXT,
    "guestAuthorAvatar" TEXT,
    "guestAuthorUrl" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "canonicalUrl" TEXT,
    "language" TEXT,
    "region" TEXT,
    "publishedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "seriesId" TEXT,
    "seriesOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "image" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "status" "SeriesStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_revisions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "revisionNumber" INTEGER NOT NULL,
    "changeNote" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_quotes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attribution" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPullQuote" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentId" TEXT,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "authorWebsite" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "spamScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spamSignals" TEXT[],
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "flagCount" INTEGER NOT NULL DEFAULT 0,
    "flagReasons" TEXT[],
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_votes" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_signals" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_settings" (
    "id" TEXT NOT NULL,
    "maxContentLength" INTEGER NOT NULL DEFAULT 5000,
    "maxAuthorNameLength" INTEGER NOT NULL DEFAULT 120,
    "maxWebsiteLength" INTEGER NOT NULL DEFAULT 300,
    "maxReplyDepth" INTEGER NOT NULL DEFAULT 5,
    "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "requireModeration" BOOLEAN NOT NULL DEFAULT false,
    "allowGuestComments" BOOLEAN NOT NULL DEFAULT true,
    "autoApproveThreshold" INTEGER NOT NULL DEFAULT 3,
    "editWindowMinutes" INTEGER NOT NULL DEFAULT 30,
    "closeCommentsAfterDays" INTEGER NOT NULL DEFAULT 0,
    "maxCommentsPerPostPerUser" INTEGER NOT NULL DEFAULT 0,
    "maxCommentsPerHour" INTEGER NOT NULL DEFAULT 0,
    "maxLinksBeforeSpam" INTEGER NOT NULL DEFAULT 3,
    "capsSpamRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "capsCheckMinLength" INTEGER NOT NULL DEFAULT 20,
    "spamScoreThreshold" INTEGER NOT NULL DEFAULT 50,
    "customSpamKeywords" TEXT[],
    "blockedEmails" TEXT[],
    "blockedDomains" TEXT[],
    "blockedIps" TEXT[],
    "enableVoting" BOOLEAN NOT NULL DEFAULT true,
    "enableReactions" BOOLEAN NOT NULL DEFAULT true,
    "enableThreading" BOOLEAN NOT NULL DEFAULT true,
    "enableProfanityFilter" BOOLEAN NOT NULL DEFAULT false,
    "enableLearningSignals" BOOLEAN NOT NULL DEFAULT true,
    "trackMetadata" BOOLEAN NOT NULL DEFAULT true,
    "profanityWords" TEXT[],
    "autoFlagThreshold" INTEGER NOT NULL DEFAULT 3,
    "pinnedCommentLimit" INTEGER NOT NULL DEFAULT 3,
    "spamRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "deletedRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "notifyOnFlag" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnSpam" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImage" TEXT,
    "parentId" TEXT,
    "path" TEXT,
    "label" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "synonymHits" INTEGER NOT NULL DEFAULT 0,
    "linkedTagIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "mergeCount" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "trending" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "protected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_follows" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tagId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "tag_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_settings" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "forceLowercase" BOOLEAN NOT NULL DEFAULT false,
    "spaceDelimiter" BOOLEAN NOT NULL DEFAULT true,
    "maxTagsPerPost" INTEGER NOT NULL DEFAULT 0,
    "autocompleteLimit" INTEGER NOT NULL DEFAULT 20,
    "autocompleteMode" TEXT NOT NULL DEFAULT 'startsWith',
    "autocompleteMinChars" INTEGER NOT NULL DEFAULT 1,
    "protectAll" BOOLEAN NOT NULL DEFAULT false,
    "protectInitial" BOOLEAN NOT NULL DEFAULT true,
    "initialTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tagCloudMin" INTEGER NOT NULL DEFAULT 1,
    "tagCloudMax" INTEGER NOT NULL DEFAULT 6,
    "enableTree" BOOLEAN NOT NULL DEFAULT true,
    "treeSeparator" TEXT NOT NULL DEFAULT '/',
    "enableFollowing" BOOLEAN NOT NULL DEFAULT true,
    "autoTagMaxTags" INTEGER NOT NULL DEFAULT 8,
    "autoTagMinConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "enableLlmAutoTag" BOOLEAN NOT NULL DEFAULT false,
    "autoCleanupDays" INTEGER NOT NULL DEFAULT 0,
    "maxNameLength" INTEGER NOT NULL DEFAULT 100,
    "maxDescriptionLength" INTEGER NOT NULL DEFAULT 500,
    "maxSynonyms" INTEGER NOT NULL DEFAULT 20,
    "maxLinkedTags" INTEGER NOT NULL DEFAULT 10,
    "maxBulkIds" INTEGER NOT NULL DEFAULT 100,
    "updatedBy" TEXT,

    CONSTRAINT "tag_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "captcha_settings" (
    "id" TEXT NOT NULL,
    "captchaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "captchaMode" TEXT NOT NULL DEFAULT 'always',
    "defaultProvider" TEXT NOT NULL DEFAULT 'turnstile',
    "enableFallbackChain" BOOLEAN NOT NULL DEFAULT true,
    "fallbackOrder" TEXT[] DEFAULT ARRAY['turnstile', 'recaptcha-v3', 'recaptcha-v2', 'hcaptcha', 'custom']::TEXT[],
    "enableTurnstile" BOOLEAN NOT NULL DEFAULT true,
    "enableRecaptchaV3" BOOLEAN NOT NULL DEFAULT true,
    "enableRecaptchaV2" BOOLEAN NOT NULL DEFAULT true,
    "enableHcaptcha" BOOLEAN NOT NULL DEFAULT true,
    "enableInhouse" BOOLEAN NOT NULL DEFAULT true,
    "turnstileSiteKey" TEXT,
    "recaptchaV2SiteKey" TEXT,
    "recaptchaV3SiteKey" TEXT,
    "hcaptchaSiteKey" TEXT,
    "inhouseCodeLength" INTEGER NOT NULL DEFAULT 6,
    "inhouseChallengeTtlMs" INTEGER NOT NULL DEFAULT 300000,
    "inhouseMaxRetries" INTEGER NOT NULL DEFAULT 3,
    "inhouseChallengeEndpoint" TEXT NOT NULL DEFAULT '/api/captcha/challenge',
    "scriptLoadTimeoutMs" INTEGER NOT NULL DEFAULT 10000,
    "requireCaptchaForLogin" BOOLEAN NOT NULL DEFAULT true,
    "requireCaptchaForRegistration" BOOLEAN NOT NULL DEFAULT true,
    "requireCaptchaForComments" BOOLEAN NOT NULL DEFAULT true,
    "requireCaptchaForContact" BOOLEAN NOT NULL DEFAULT true,
    "requireCaptchaForPasswordReset" BOOLEAN NOT NULL DEFAULT true,
    "requireCaptchaForNewsletter" BOOLEAN NOT NULL DEFAULT false,
    "recaptchaV3ScoreThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "maxFailedAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockoutDurationMinutes" INTEGER NOT NULL DEFAULT 15,
    "exemptAuthenticatedUsers" BOOLEAN NOT NULL DEFAULT false,
    "exemptAdmins" BOOLEAN NOT NULL DEFAULT true,
    "exemptedIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "theme" TEXT NOT NULL DEFAULT 'auto',
    "size" TEXT NOT NULL DEFAULT 'normal',
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "captcha_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "captcha_attempts" (
    "id" TEXT NOT NULL,
    "clientIp" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "score" DOUBLE PRECISION,
    "service" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captcha_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "captcha_challenges" (
    "id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "clientIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captcha_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editor_settings" (
    "id" TEXT NOT NULL,
    "editorEnabled" BOOLEAN NOT NULL DEFAULT true,
    "enableBold" BOOLEAN NOT NULL DEFAULT true,
    "enableItalic" BOOLEAN NOT NULL DEFAULT true,
    "enableUnderline" BOOLEAN NOT NULL DEFAULT true,
    "enableStrikethrough" BOOLEAN NOT NULL DEFAULT true,
    "enableHeadings" BOOLEAN NOT NULL DEFAULT true,
    "allowedHeadingLevels" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "enableLists" BOOLEAN NOT NULL DEFAULT true,
    "enableTaskLists" BOOLEAN NOT NULL DEFAULT true,
    "enableBlockquotes" BOOLEAN NOT NULL DEFAULT true,
    "enableCodeBlocks" BOOLEAN NOT NULL DEFAULT true,
    "enableInlineCode" BOOLEAN NOT NULL DEFAULT true,
    "enableLinks" BOOLEAN NOT NULL DEFAULT true,
    "enableImages" BOOLEAN NOT NULL DEFAULT true,
    "enableVideoEmbeds" BOOLEAN NOT NULL DEFAULT true,
    "enableTables" BOOLEAN NOT NULL DEFAULT true,
    "enableHorizontalRule" BOOLEAN NOT NULL DEFAULT true,
    "enableTextColor" BOOLEAN NOT NULL DEFAULT true,
    "enableBackgroundColor" BOOLEAN NOT NULL DEFAULT true,
    "enableAlignment" BOOLEAN NOT NULL DEFAULT true,
    "enableFullscreen" BOOLEAN NOT NULL DEFAULT true,
    "enableUndoRedo" BOOLEAN NOT NULL DEFAULT true,
    "enableMarkdownShortcuts" BOOLEAN NOT NULL DEFAULT true,
    "enableDragDropUpload" BOOLEAN NOT NULL DEFAULT true,
    "maxWordCount" INTEGER NOT NULL DEFAULT 0,
    "maxCharCount" INTEGER NOT NULL DEFAULT 0,
    "maxImageSizeBytes" INTEGER NOT NULL DEFAULT 10485760,
    "allowedImageTypes" TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']::TEXT[],
    "defaultImageWidth" INTEGER NOT NULL DEFAULT 1200,
    "defaultImageHeight" INTEGER NOT NULL DEFAULT 675,
    "allowedVideoProviders" TEXT[] DEFAULT ARRAY['youtube', 'vimeo']::TEXT[],
    "maxTableRows" INTEGER NOT NULL DEFAULT 20,
    "maxTableCols" INTEGER NOT NULL DEFAULT 10,
    "colorPalette" TEXT[] DEFAULT ARRAY['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#c0392b', '#d35400', '#f39c12', '#27ae60', '#2980b9', '#8e44ad', '#fadbd8', '#fdebd0', '#fef9e7', '#d5f5e3', '#d6eaf8', '#ebdef0']::TEXT[],
    "defaultTextColor" TEXT NOT NULL DEFAULT '#000000',
    "maxHistorySize" INTEGER NOT NULL DEFAULT 50,
    "autoSaveDebounceMs" INTEGER NOT NULL DEFAULT 2000,
    "readingWpm" INTEGER NOT NULL DEFAULT 200,
    "defaultPlaceholder" TEXT NOT NULL DEFAULT 'Start writing your content here...',
    "defaultMinHeight" TEXT NOT NULL DEFAULT '300px',
    "defaultMaxHeight" TEXT NOT NULL DEFAULT '600px',
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "editor_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_suggestions" (
    "id" TEXT NOT NULL,
    "targetType" "SeoTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "category" "SeoSuggestionCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" "SeoSuggestionStatus" NOT NULL DEFAULT 'NEW',
    "source" "SeoSuggestionSource" NOT NULL DEFAULT 'AUDIT',
    "proposed" JSONB,
    "autoApply" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_keywords" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "intent" "SeoKeywordIntent" NOT NULL DEFAULT 'OTHER',
    "source" TEXT NOT NULL DEFAULT 'system',
    "volume" INTEGER,
    "competition" DOUBLE PRECISION,
    "cpc" DOUBLE PRECISION,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_entities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "SeoEntityType" NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_entity_edges" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "relation" "SeoEntityRelation" NOT NULL DEFAULT 'CO_OCCURRENCE',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_entity_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_keyword_history" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "volume" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "competition" DOUBLE PRECISION,

    CONSTRAINT "seo_keyword_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_operations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BatchOperationStatus" NOT NULL DEFAULT 'PENDING',
    "suggestions" JSONB NOT NULL,
    "results" JSONB,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_redirects" (
    "id" TEXT NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_redirects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "template" TEXT NOT NULL DEFAULT 'DEFAULT',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "systemKey" TEXT,
    "isHomePage" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "canonicalUrl" TEXT,
    "noIndex" BOOLEAN NOT NULL DEFAULT false,
    "noFollow" BOOLEAN NOT NULL DEFAULT false,
    "structuredData" JSONB,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT NOT NULL DEFAULT '/',
    "level" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "readingTime" INTEGER NOT NULL DEFAULT 1,
    "featuredImage" TEXT,
    "featuredImageAlt" TEXT,
    "password" TEXT,
    "customCss" TEXT,
    "customJs" TEXT,
    "customHead" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_revisions" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "template" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "changeNote" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_settings" (
    "id" TEXT NOT NULL,
    "pagesPerPage" INTEGER NOT NULL DEFAULT 20,
    "minWordCount" INTEGER NOT NULL DEFAULT 0,
    "readingSpeedWpm" INTEGER NOT NULL DEFAULT 200,
    "pagesBaseUrl" TEXT NOT NULL DEFAULT '',
    "excerptLength" INTEGER NOT NULL DEFAULT 200,
    "lockTimeoutMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxRevisionsPerPage" INTEGER NOT NULL DEFAULT 50,
    "maxDepth" INTEGER NOT NULL DEFAULT 6,
    "allowCodeInjection" BOOLEAN NOT NULL DEFAULT false,
    "enableRevisions" BOOLEAN NOT NULL DEFAULT true,
    "enableLocking" BOOLEAN NOT NULL DEFAULT true,
    "enableScheduling" BOOLEAN NOT NULL DEFAULT true,
    "enableHierarchy" BOOLEAN NOT NULL DEFAULT true,
    "enablePasswordProtection" BOOLEAN NOT NULL DEFAULT true,
    "autoRegisterSystemPages" BOOLEAN NOT NULL DEFAULT true,
    "defaultTemplate" TEXT NOT NULL DEFAULT 'DEFAULT',
    "defaultVisibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "defaultStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL DEFAULT 'My Website',
    "siteTagline" TEXT,
    "siteDescription" TEXT,
    "siteUrl" TEXT,
    "logoUrl" TEXT,
    "logoDarkUrl" TEXT,
    "faviconUrl" TEXT NOT NULL DEFAULT '/favicon.ico',
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "primaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "secondaryColor" TEXT NOT NULL DEFAULT '#64748b',
    "accentColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "fontFamily" TEXT NOT NULL DEFAULT 'system-ui, sans-serif',
    "headingFontFamily" TEXT,
    "darkModeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "darkModeDefault" BOOLEAN NOT NULL DEFAULT false,
    "customCss" TEXT,
    "themeColor" TEXT,
    "dateFormat" TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    "timeFormat" TEXT NOT NULL DEFAULT 'HH:mm',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "currencySymbol" TEXT NOT NULL DEFAULT '$',
    "topBarEnabled" BOOLEAN NOT NULL DEFAULT false,
    "topBarPhone" TEXT,
    "topBarEmail" TEXT,
    "topBarAddress" TEXT,
    "topBarText" TEXT,
    "topBarShowSocialLinks" BOOLEAN NOT NULL DEFAULT false,
    "topBarBusinessHours" TEXT,
    "topBarBackgroundColor" TEXT NOT NULL DEFAULT '#1a1a2e',
    "topBarTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "topBarCtaText" TEXT,
    "topBarCtaUrl" TEXT,
    "topBarDismissible" BOOLEAN NOT NULL DEFAULT false,
    "announcementEnabled" BOOLEAN NOT NULL DEFAULT false,
    "announcementText" TEXT,
    "announcementType" TEXT NOT NULL DEFAULT 'info',
    "announcementUrl" TEXT,
    "announcementDismissible" BOOLEAN NOT NULL DEFAULT true,
    "announcementBackgroundColor" TEXT,
    "headerStyle" TEXT NOT NULL DEFAULT 'sticky',
    "navShowSearch" BOOLEAN NOT NULL DEFAULT true,
    "navShowLanguageSwitcher" BOOLEAN NOT NULL DEFAULT false,
    "navShowDarkModeToggle" BOOLEAN NOT NULL DEFAULT true,
    "menuStructure" JSONB,
    "themeConfig" JSONB,
    "footerText" TEXT,
    "footerShowSocialLinks" BOOLEAN NOT NULL DEFAULT true,
    "footerShowContactInfo" BOOLEAN NOT NULL DEFAULT false,
    "footerSecondaryText" TEXT,
    "socialFacebook" TEXT,
    "socialTwitter" TEXT,
    "socialInstagram" TEXT,
    "socialLinkedin" TEXT,
    "socialYoutube" TEXT,
    "socialWhatsapp" TEXT,
    "socialTiktok" TEXT,
    "socialTelegram" TEXT,
    "socialGithub" TEXT,
    "socialPinterest" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactAddress" TEXT,
    "seoTitleTemplate" TEXT,
    "seoDefaultImage" TEXT,
    "seoGoogleVerification" TEXT,
    "seoGoogleAnalyticsId" TEXT,
    "seoBingVerification" TEXT,
    "seoYandexVerification" TEXT,
    "seoPinterestVerification" TEXT,
    "seoBaiduVerification" TEXT,
    "captchaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "captchaType" TEXT NOT NULL DEFAULT 'turnstile',
    "captchaProvider" TEXT NOT NULL DEFAULT 'none',
    "captchaSiteKey" TEXT,
    "captchaSecretKey" TEXT,
    "captchaThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "captchaOnContactForm" BOOLEAN NOT NULL DEFAULT false,
    "captchaOnComments" BOOLEAN NOT NULL DEFAULT false,
    "enableTurnstile" BOOLEAN NOT NULL DEFAULT true,
    "enableRecaptchaV3" BOOLEAN NOT NULL DEFAULT false,
    "enableRecaptchaV2" BOOLEAN NOT NULL DEFAULT false,
    "enableHcaptcha" BOOLEAN NOT NULL DEFAULT false,
    "enableInhouse" BOOLEAN NOT NULL DEFAULT true,
    "turnstileSiteKey" TEXT,
    "recaptchaV3SiteKey" TEXT,
    "recaptchaV2SiteKey" TEXT,
    "hcaptchaSiteKey" TEXT,
    "inhouseCodeLength" INTEGER NOT NULL DEFAULT 6,
    "requireCaptchaLogin" BOOLEAN NOT NULL DEFAULT false,
    "requireCaptchaRegister" BOOLEAN NOT NULL DEFAULT false,
    "requireCaptchaComment" BOOLEAN NOT NULL DEFAULT false,
    "requireCaptchaContact" BOOLEAN NOT NULL DEFAULT false,
    "postsPerPage" INTEGER NOT NULL DEFAULT 10,
    "excerptLength" INTEGER NOT NULL DEFAULT 300,
    "showFullContentInListing" BOOLEAN NOT NULL DEFAULT false,
    "enableRss" BOOLEAN NOT NULL DEFAULT true,
    "rssFeedTitle" TEXT,
    "enableComments" BOOLEAN NOT NULL DEFAULT true,
    "enableSearch" BOOLEAN NOT NULL DEFAULT true,
    "enableRegistration" BOOLEAN NOT NULL DEFAULT true,
    "defaultPostStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "blogLayout" TEXT NOT NULL DEFAULT 'grid',
    "blogColumns" INTEGER NOT NULL DEFAULT 2,
    "showAuthor" BOOLEAN NOT NULL DEFAULT true,
    "showDate" BOOLEAN NOT NULL DEFAULT true,
    "showReadTime" BOOLEAN NOT NULL DEFAULT true,
    "showTags" BOOLEAN NOT NULL DEFAULT true,
    "showFeaturedImage" BOOLEAN NOT NULL DEFAULT true,
    "showExcerpt" BOOLEAN NOT NULL DEFAULT true,
    "showViewCount" BOOLEAN NOT NULL DEFAULT false,
    "sidebarEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sidebarPosition" TEXT NOT NULL DEFAULT 'right',
    "sidebarShowSearch" BOOLEAN NOT NULL DEFAULT true,
    "sidebarShowRecentPosts" BOOLEAN NOT NULL DEFAULT true,
    "sidebarShowCategories" BOOLEAN NOT NULL DEFAULT true,
    "sidebarShowTags" BOOLEAN NOT NULL DEFAULT true,
    "sidebarShowArchive" BOOLEAN NOT NULL DEFAULT false,
    "sidebarRecentPostsCount" INTEGER NOT NULL DEFAULT 5,
    "relatedPostsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "relatedPostsCount" INTEGER NOT NULL DEFAULT 3,
    "socialSharingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tableOfContentsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "showPostNavigation" BOOLEAN NOT NULL DEFAULT true,
    "enableCommentModeration" BOOLEAN NOT NULL DEFAULT true,
    "autoApproveComments" BOOLEAN NOT NULL DEFAULT false,
    "enableCommentVoting" BOOLEAN NOT NULL DEFAULT false,
    "enableCommentThreading" BOOLEAN NOT NULL DEFAULT true,
    "allowGuestComments" BOOLEAN NOT NULL DEFAULT true,
    "maxReplyDepth" INTEGER NOT NULL DEFAULT 5,
    "closeCommentsAfterDays" INTEGER NOT NULL DEFAULT 0,
    "editWindowMinutes" INTEGER NOT NULL DEFAULT 30,
    "cookieConsentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cookieConsentMessage" TEXT NOT NULL DEFAULT 'This website uses cookies to ensure you get the best experience.',
    "privacyPolicyUrl" TEXT,
    "termsOfServiceUrl" TEXT,
    "gdprEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailFromName" TEXT,
    "emailFromAddress" TEXT,
    "emailReplyTo" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifyOnComment" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifyOnUser" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifyOnContact" BOOLEAN NOT NULL DEFAULT true,
    "emailWelcomeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailDigestFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "googleTagManagerId" TEXT,
    "facebookPixelId" TEXT,
    "hotjarId" TEXT,
    "clarityId" TEXT,
    "maxUploadSizeMb" INTEGER NOT NULL DEFAULT 10,
    "allowedFileTypes" TEXT NOT NULL DEFAULT 'jpg,jpeg,png,gif,webp,svg,pdf,doc,docx',
    "imageOptimizationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pwaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pwaName" TEXT,
    "pwaShortName" TEXT,
    "pwaThemeColor" TEXT,
    "pwaBackgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "robotsTxtCustom" TEXT,
    "sitemapEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sitemapChangeFreq" TEXT NOT NULL DEFAULT 'weekly',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT NOT NULL DEFAULT 'We are currently performing maintenance. Please check back soon.',
    "maintenanceAllowedIps" TEXT,
    "customHeadCode" TEXT,
    "customFooterCode" TEXT,
    "adsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "distributionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_logs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "summary" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "triggeredBy" TEXT NOT NULL DEFAULT 'scheduler',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cron_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_locks" (
    "id" TEXT NOT NULL DEFAULT 'cron-global',
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "holder" TEXT NOT NULL,

    CONSTRAINT "cron_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT,
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "folder" TEXT NOT NULL DEFAULT 'uploads',
    "isOptimized" BOOLEAN NOT NULL DEFAULT false,
    "variants" JSONB,
    "uploadedById" TEXT,
    "contentHash" TEXT,
    "hashAlgorithm" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "settings" JSONB NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "clientId" TEXT,
    "publisherId" TEXT,
    "apiKey" TEXT,
    "scriptUrl" TEXT,
    "dataAttributes" JSONB NOT NULL DEFAULT '{}',
    "config" JSONB,
    "killSwitch" BOOLEAN NOT NULL DEFAULT false,
    "supportedFormats" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowConcurrent" BOOLEAN NOT NULL DEFAULT true,
    "exclusiveWith" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxPerPage" INTEGER NOT NULL DEFAULT 5,
    "loadStrategy" TEXT NOT NULL DEFAULT 'lazy',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_slots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'DISPLAY',
    "description" TEXT,
    "responsiveSizes" JSONB NOT NULL DEFAULT '{}',
    "maxWidth" INTEGER,
    "maxHeight" INTEGER,
    "responsive" BOOLEAN NOT NULL DEFAULT true,
    "containerSelector" TEXT,
    "excludeSelectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pageTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludePages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "multiProvider" BOOLEAN NOT NULL DEFAULT false,
    "renderPriority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_placements" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "adUnitId" TEXT,
    "adCode" TEXT,
    "customHtml" TEXT,
    "autoResize" BOOLEAN NOT NULL DEFAULT true,
    "minContainerWidth" INTEGER NOT NULL DEFAULT 0,
    "maxContainerWidth" INTEGER NOT NULL DEFAULT 0,
    "visibleBreakpoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "autoPlace" BOOLEAN NOT NULL DEFAULT false,
    "autoStrategy" TEXT NOT NULL DEFAULT 'PARAGRAPH_COUNT',
    "minParagraphs" INTEGER NOT NULL DEFAULT 3,
    "paragraphGap" INTEGER NOT NULL DEFAULT 4,
    "maxAdsPerPage" INTEGER NOT NULL DEFAULT 5,
    "lazyOffset" INTEGER NOT NULL DEFAULT 200,
    "refreshIntervalSec" INTEGER NOT NULL DEFAULT 0,
    "closeable" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_logs" (
    "id" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_settings" (
    "id" TEXT NOT NULL,
    "adsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sanitizeAdCode" BOOLEAN NOT NULL DEFAULT true,
    "allowedProviderTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lazyLoadAds" BOOLEAN NOT NULL DEFAULT true,
    "defaultLazyOffset" INTEGER NOT NULL DEFAULT 200,
    "globalMaxAdsPerPage" INTEGER NOT NULL DEFAULT 5,
    "defaultMinParagraphs" INTEGER NOT NULL DEFAULT 3,
    "defaultParagraphGap" INTEGER NOT NULL DEFAULT 4,
    "skipCodeBlocks" BOOLEAN NOT NULL DEFAULT true,
    "respectSectionBreaks" BOOLEAN NOT NULL DEFAULT true,
    "enableAutoPlacement" BOOLEAN NOT NULL DEFAULT false,
    "autoAdStrategy" TEXT NOT NULL DEFAULT 'PARAGRAPH_COUNT',
    "enableAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "enableComplianceScanning" BOOLEAN NOT NULL DEFAULT false,
    "cacheTtlSeconds" INTEGER NOT NULL DEFAULT 300,
    "eventRateLimitMax" INTEGER NOT NULL DEFAULT 50,
    "eventRateLimitWindowMs" INTEGER NOT NULL DEFAULT 60000,
    "minContentLength" INTEGER NOT NULL DEFAULT 500,
    "positionKillSwitches" JSONB NOT NULL DEFAULT '{}',
    "enableWidgetAds" BOOLEAN NOT NULL DEFAULT false,
    "widgetAdConfig" JSONB NOT NULL DEFAULT '{}',
    "enableResponsive" BOOLEAN NOT NULL DEFAULT true,
    "breakpoints" JSONB NOT NULL DEFAULT '{}',
    "concurrencyPolicy" JSONB NOT NULL DEFAULT '{}',
    "maxViewportAdCoverage" INTEGER NOT NULL DEFAULT 30,
    "minAdSpacingPx" INTEGER NOT NULL DEFAULT 250,
    "deferUntilLcp" BOOLEAN NOT NULL DEFAULT true,
    "enableAdsTxt" BOOLEAN NOT NULL DEFAULT false,
    "adsTxtCustomEntries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requireConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentModes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enableAdRefresh" BOOLEAN NOT NULL DEFAULT false,
    "minRefreshInterval" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_records" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "channelId" TEXT,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "content" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "externalUrl" TEXT,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "platformRules" JSONB,
    "renewIntervalDays" INTEGER NOT NULL DEFAULT 0,
    "lastPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PostTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PostTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PostCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PostCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_LinkedTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LinkedTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_refreshTokenHash_idx" ON "user_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");

-- CreateIndex
CREATE INDEX "email_verification_tokens_tokenHash_idx" ON "email_verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "email_change_requests_userId_idx" ON "email_change_requests"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "posts_status_deletedAt_idx" ON "posts"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "posts_status_noIndex_idx" ON "posts"("status", "noIndex");

-- CreateIndex
CREATE INDEX "posts_authorId_idx" ON "posts"("authorId");

-- CreateIndex
CREATE INDEX "posts_seriesId_idx" ON "posts"("seriesId");

-- CreateIndex
CREATE INDEX "posts_isFeatured_status_idx" ON "posts"("isFeatured", "status");

-- CreateIndex
CREATE INDEX "posts_isPinned_status_idx" ON "posts"("isPinned", "status");

-- CreateIndex
CREATE INDEX "posts_publishedAt_idx" ON "posts"("publishedAt");

-- CreateIndex
CREATE INDEX "posts_viewCount_idx" ON "posts"("viewCount");

-- CreateIndex
CREATE INDEX "posts_isGuestPost_idx" ON "posts"("isGuestPost");

-- CreateIndex
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt");

-- CreateIndex
CREATE INDEX "posts_deletedAt_idx" ON "posts"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_featured_idx" ON "categories"("featured");

-- CreateIndex
CREATE INDEX "categories_sortOrder_idx" ON "categories"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "series_slug_key" ON "series"("slug");

-- CreateIndex
CREATE INDEX "series_status_idx" ON "series"("status");

-- CreateIndex
CREATE INDEX "post_revisions_postId_revisionNumber_idx" ON "post_revisions"("postId", "revisionNumber");

-- CreateIndex
CREATE INDEX "post_quotes_postId_sortOrder_idx" ON "post_quotes"("postId", "sortOrder");

-- CreateIndex
CREATE INDEX "comments_postId_status_deletedAt_idx" ON "comments"("postId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "comments_userId_idx" ON "comments"("userId");

-- CreateIndex
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

-- CreateIndex
CREATE INDEX "comments_status_createdAt_idx" ON "comments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "comments_postId_isPinned_idx" ON "comments"("postId", "isPinned");

-- CreateIndex
CREATE UNIQUE INDEX "comment_votes_commentId_visitorId_key" ON "comment_votes"("commentId", "visitorId");

-- CreateIndex
CREATE INDEX "learning_signals_commentId_idx" ON "learning_signals"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_slug_idx" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_parentId_idx" ON "tags"("parentId");

-- CreateIndex
CREATE INDEX "tags_usageCount_idx" ON "tags"("usageCount");

-- CreateIndex
CREATE INDEX "tags_featured_idx" ON "tags"("featured");

-- CreateIndex
CREATE INDEX "tags_trending_idx" ON "tags"("trending");

-- CreateIndex
CREATE INDEX "tags_locked_idx" ON "tags"("locked");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_path_idx" ON "tags"("path");

-- CreateIndex
CREATE INDEX "tags_level_idx" ON "tags"("level");

-- CreateIndex
CREATE INDEX "tags_protected_idx" ON "tags"("protected");

-- CreateIndex
CREATE INDEX "tag_follows_userId_idx" ON "tag_follows"("userId");

-- CreateIndex
CREATE INDEX "tag_follows_tagId_idx" ON "tag_follows"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "tag_follows_tagId_userId_key" ON "tag_follows"("tagId", "userId");

-- CreateIndex
CREATE INDEX "captcha_attempts_clientIp_success_createdAt_idx" ON "captcha_attempts"("clientIp", "success", "createdAt");

-- CreateIndex
CREATE INDEX "captcha_attempts_provider_createdAt_idx" ON "captcha_attempts"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "captcha_attempts_createdAt_idx" ON "captcha_attempts"("createdAt");

-- CreateIndex
CREATE INDEX "captcha_challenges_expiresAt_idx" ON "captcha_challenges"("expiresAt");

-- CreateIndex
CREATE INDEX "captcha_challenges_clientIp_createdAt_idx" ON "captcha_challenges"("clientIp", "createdAt");

-- CreateIndex
CREATE INDEX "seo_suggestions_targetType_targetId_idx" ON "seo_suggestions"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "seo_suggestions_status_idx" ON "seo_suggestions"("status");

-- CreateIndex
CREATE INDEX "seo_suggestions_category_idx" ON "seo_suggestions"("category");

-- CreateIndex
CREATE INDEX "seo_suggestions_createdAt_idx" ON "seo_suggestions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "seo_keywords_slug_key" ON "seo_keywords"("slug");

-- CreateIndex
CREATE INDEX "seo_keywords_intent_idx" ON "seo_keywords"("intent");

-- CreateIndex
CREATE INDEX "seo_keywords_source_idx" ON "seo_keywords"("source");

-- CreateIndex
CREATE INDEX "seo_keywords_lastSeenAt_idx" ON "seo_keywords"("lastSeenAt");

-- CreateIndex
CREATE INDEX "seo_entities_type_idx" ON "seo_entities"("type");

-- CreateIndex
CREATE INDEX "seo_entities_source_idx" ON "seo_entities"("source");

-- CreateIndex
CREATE UNIQUE INDEX "seo_entities_slug_type_key" ON "seo_entities"("slug", "type");

-- CreateIndex
CREATE INDEX "seo_entity_edges_fromId_idx" ON "seo_entity_edges"("fromId");

-- CreateIndex
CREATE INDEX "seo_entity_edges_toId_idx" ON "seo_entity_edges"("toId");

-- CreateIndex
CREATE INDEX "seo_entity_edges_relation_idx" ON "seo_entity_edges"("relation");

-- CreateIndex
CREATE UNIQUE INDEX "seo_entity_edges_fromId_toId_relation_key" ON "seo_entity_edges"("fromId", "toId", "relation");

-- CreateIndex
CREATE INDEX "seo_keyword_history_keyword_timestamp_idx" ON "seo_keyword_history"("keyword", "timestamp");

-- CreateIndex
CREATE INDEX "seo_keyword_history_timestamp_idx" ON "seo_keyword_history"("timestamp");

-- CreateIndex
CREATE INDEX "batch_operations_status_idx" ON "batch_operations"("status");

-- CreateIndex
CREATE INDEX "batch_operations_createdAt_idx" ON "batch_operations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "seo_redirects_fromPath_key" ON "seo_redirects"("fromPath");

-- CreateIndex
CREATE INDEX "seo_redirects_fromPath_idx" ON "seo_redirects"("fromPath");

-- CreateIndex
CREATE INDEX "seo_redirects_isActive_idx" ON "seo_redirects"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "pages_systemKey_key" ON "pages"("systemKey");

-- CreateIndex
CREATE INDEX "pages_status_idx" ON "pages"("status");

-- CreateIndex
CREATE INDEX "pages_slug_idx" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_systemKey_idx" ON "pages"("systemKey");

-- CreateIndex
CREATE INDEX "pages_parentId_idx" ON "pages"("parentId");

-- CreateIndex
CREATE INDEX "pages_authorId_idx" ON "pages"("authorId");

-- CreateIndex
CREATE INDEX "pages_status_deletedAt_idx" ON "pages"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "pages_isSystem_idx" ON "pages"("isSystem");

-- CreateIndex
CREATE INDEX "pages_scheduledFor_idx" ON "pages"("scheduledFor");

-- CreateIndex
CREATE INDEX "pages_deletedAt_idx" ON "pages"("deletedAt");

-- CreateIndex
CREATE INDEX "pages_isHomePage_idx" ON "pages"("isHomePage");

-- CreateIndex
CREATE INDEX "page_revisions_pageId_idx" ON "page_revisions"("pageId");

-- CreateIndex
CREATE INDEX "page_revisions_pageId_revisionNumber_idx" ON "page_revisions"("pageId", "revisionNumber");

-- CreateIndex
CREATE INDEX "jobs_status_createdAt_idx" ON "jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "cron_logs_createdAt_idx" ON "cron_logs"("createdAt");

-- CreateIndex
CREATE INDEX "media_folder_idx" ON "media"("folder");

-- CreateIndex
CREATE INDEX "media_mimeType_idx" ON "media"("mimeType");

-- CreateIndex
CREATE INDEX "media_status_idx" ON "media"("status");

-- CreateIndex
CREATE INDEX "media_contentHash_idx" ON "media"("contentHash");

-- CreateIndex
CREATE INDEX "media_uploadedById_idx" ON "media"("uploadedById");

-- CreateIndex
CREATE INDEX "media_createdAt_idx" ON "media"("createdAt");

-- CreateIndex
CREATE INDEX "media_folder_status_createdAt_idx" ON "media"("folder", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "media_folders_path_key" ON "media_folders"("path");

-- CreateIndex
CREATE INDEX "media_folders_parentId_idx" ON "media_folders"("parentId");

-- CreateIndex
CREATE INDEX "media_folders_path_idx" ON "media_folders"("path");

-- CreateIndex
CREATE UNIQUE INDEX "ad_providers_slug_key" ON "ad_providers"("slug");

-- CreateIndex
CREATE INDEX "ad_providers_type_idx" ON "ad_providers"("type");

-- CreateIndex
CREATE INDEX "ad_providers_isActive_killSwitch_idx" ON "ad_providers"("isActive", "killSwitch");

-- CreateIndex
CREATE UNIQUE INDEX "ad_slots_slug_key" ON "ad_slots"("slug");

-- CreateIndex
CREATE INDEX "ad_slots_position_idx" ON "ad_slots"("position");

-- CreateIndex
CREATE INDEX "ad_slots_isActive_idx" ON "ad_slots"("isActive");

-- CreateIndex
CREATE INDEX "ad_placements_providerId_idx" ON "ad_placements"("providerId");

-- CreateIndex
CREATE INDEX "ad_placements_slotId_idx" ON "ad_placements"("slotId");

-- CreateIndex
CREATE INDEX "ad_placements_isActive_startDate_endDate_idx" ON "ad_placements"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ad_logs_placementId_eventType_idx" ON "ad_logs"("placementId", "eventType");

-- CreateIndex
CREATE INDEX "ad_logs_createdAt_idx" ON "ad_logs"("createdAt");

-- CreateIndex
CREATE INDEX "distribution_records_postId_status_idx" ON "distribution_records"("postId", "status");

-- CreateIndex
CREATE INDEX "distribution_records_channelId_idx" ON "distribution_records"("channelId");

-- CreateIndex
CREATE INDEX "distribution_records_platform_status_idx" ON "distribution_records"("platform", "status");

-- CreateIndex
CREATE INDEX "distribution_records_status_scheduledFor_idx" ON "distribution_records"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "distribution_records_createdAt_idx" ON "distribution_records"("createdAt");

-- CreateIndex
CREATE INDEX "distribution_channels_platform_enabled_idx" ON "distribution_channels"("platform", "enabled");

-- CreateIndex
CREATE INDEX "distribution_channels_enabled_idx" ON "distribution_channels"("enabled");

-- CreateIndex
CREATE INDEX "_PostTags_B_index" ON "_PostTags"("B");

-- CreateIndex
CREATE INDEX "_PostCategories_B_index" ON "_PostCategories"("B");

-- CreateIndex
CREATE INDEX "_LinkedTags_B_index" ON "_LinkedTags"("B");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_change_requests" ADD CONSTRAINT "email_change_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_quotes" ADD CONSTRAINT "post_quotes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_signals" ADD CONSTRAINT "learning_signals_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_follows" ADD CONSTRAINT "tag_follows_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_entity_edges" ADD CONSTRAINT "seo_entity_edges_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "seo_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_entity_edges" ADD CONSTRAINT "seo_entity_edges_toId_fkey" FOREIGN KEY ("toId") REFERENCES "seo_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_revisions" ADD CONSTRAINT "page_revisions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_placements" ADD CONSTRAINT "ad_placements_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ad_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_placements" ADD CONSTRAINT "ad_placements_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ad_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_logs" ADD CONSTRAINT "ad_logs_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "ad_placements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_records" ADD CONSTRAINT "distribution_records_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_records" ADD CONSTRAINT "distribution_records_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "distribution_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostTags" ADD CONSTRAINT "_PostTags_A_fkey" FOREIGN KEY ("A") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostTags" ADD CONSTRAINT "_PostTags_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostCategories" ADD CONSTRAINT "_PostCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostCategories" ADD CONSTRAINT "_PostCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LinkedTags" ADD CONSTRAINT "_LinkedTags_A_fkey" FOREIGN KEY ("A") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LinkedTags" ADD CONSTRAINT "_LinkedTags_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

