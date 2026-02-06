/**
 * Core type definitions for Microsoft Teams platform
 */
import { z } from 'zod';
export interface TeamsTeam {
    id: string;
    name: string;
    description?: string;
}
export interface TeamsChannel {
    id: string;
    team_id: string;
    name: string;
    type: string;
}
export interface TeamsMessage {
    id: string;
    channel_id: string;
    author: {
        id: string;
        displayName: string;
    };
    content: string;
    timestamp: string;
}
export interface TeamsUser {
    id: string;
    displayName: string;
    email?: string;
    userPrincipalName?: string;
}
export interface TeamsReaction {
    emoji: string;
    count: number;
}
export interface TeamsFile {
    id: string;
    name: string;
    size: number;
    url: string;
    contentType?: string;
}
export interface TeamsCredentials {
    token: string;
    cookie?: string;
}
export interface TeamsConfig {
    current_team: string | null;
    token: string;
    token_expires_at?: string;
    teams: Record<string, {
        team_id: string;
        team_name: string;
    }>;
}
export declare const TeamsTeamSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description?: string | undefined;
}, {
    id: string;
    name: string;
    description?: string | undefined;
}>;
export declare const TeamsChannelSchema: z.ZodObject<{
    id: z.ZodString;
    team_id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    type: string;
    team_id: string;
}, {
    id: string;
    name: string;
    type: string;
    team_id: string;
}>;
export declare const TeamsMessageSchema: z.ZodObject<{
    id: z.ZodString;
    channel_id: z.ZodString;
    author: z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        displayName: string;
    }, {
        id: string;
        displayName: string;
    }>;
    content: z.ZodString;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    id: string;
    channel_id: string;
    author: {
        id: string;
        displayName: string;
    };
    content: string;
}, {
    timestamp: string;
    id: string;
    channel_id: string;
    author: {
        id: string;
        displayName: string;
    };
    content: string;
}>;
export declare const TeamsUserSchema: z.ZodObject<{
    id: z.ZodString;
    displayName: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    userPrincipalName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    displayName: string;
    email?: string | undefined;
    userPrincipalName?: string | undefined;
}, {
    id: string;
    displayName: string;
    email?: string | undefined;
    userPrincipalName?: string | undefined;
}>;
export declare const TeamsReactionSchema: z.ZodObject<{
    emoji: z.ZodString;
    count: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    emoji: string;
    count: number;
}, {
    emoji: string;
    count: number;
}>;
export declare const TeamsFileSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    size: z.ZodNumber;
    url: z.ZodString;
    contentType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    size: number;
    url: string;
    contentType?: string | undefined;
}, {
    id: string;
    name: string;
    size: number;
    url: string;
    contentType?: string | undefined;
}>;
export declare const TeamsCredentialsSchema: z.ZodObject<{
    token: z.ZodString;
    cookie: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    token: string;
    cookie?: string | undefined;
}, {
    token: string;
    cookie?: string | undefined;
}>;
export declare const TeamsConfigSchema: z.ZodObject<{
    current_team: z.ZodNullable<z.ZodString>;
    token: z.ZodString;
    token_expires_at: z.ZodOptional<z.ZodString>;
    teams: z.ZodRecord<z.ZodString, z.ZodObject<{
        team_id: z.ZodString;
        team_name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        team_id: string;
        team_name: string;
    }, {
        team_id: string;
        team_name: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    teams: Record<string, {
        team_id: string;
        team_name: string;
    }>;
    token: string;
    current_team: string | null;
    token_expires_at?: string | undefined;
}, {
    teams: Record<string, {
        team_id: string;
        team_name: string;
    }>;
    token: string;
    current_team: string | null;
    token_expires_at?: string | undefined;
}>;
export declare class TeamsError extends Error {
    code: string;
    constructor(message: string, code: string);
}
//# sourceMappingURL=types.d.ts.map