
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "cities": {
                  Row: {
                    "boundary": unknown,"center": unknown,"county": string,"created_at": string,"has_field_team": boolean,"has_online_coverage": boolean,"id": string,"name": string,"position": number,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "boundary": unknown,"center": unknown,"county": string,"created_at"?: string,"has_field_team"?: boolean,"has_online_coverage"?: boolean,"id"?: string,"name": string,"position"?: number,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "boundary"?: unknown,"center"?: unknown,"county"?: string,"created_at"?: string,"has_field_team"?: boolean,"has_online_coverage"?: boolean,"id"?: string,"name"?: string,"position"?: number,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"listings": {
                  Row: {
                    "area_m2": number,"city": string,"created_at": string,"currency": string,"id": string,"latitude": number,"longitude": number,"owner_id": string,"photo_path": string | null,"price": number,"published_at": string | null,"rooms": number,"smartcheck_score": number | null,"status": Database["public"]['Enums']["listing_status"],"street_label": string,"title": string,"transaction": Database["public"]['Enums']["listing_transaction"],"updated_at": string,"verification": Database["public"]['Enums']["listing_verification"]
                  }
                  ComputedFields: never
                  Insert: {
                    "area_m2": number,"city": string,"created_at"?: string,"currency": string,"id"?: string,"latitude": number,"longitude": number,"owner_id"?: string,"photo_path"?: string | null,"price": number,"published_at"?: string | null,"rooms": number,"smartcheck_score"?: number | null,"status"?: Database["public"]['Enums']["listing_status"],"street_label": string,"title": string,"transaction": Database["public"]['Enums']["listing_transaction"],"updated_at"?: string,"verification"?: Database["public"]['Enums']["listing_verification"]
                  }
                  Update: {
                    "area_m2"?: number,"city"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"latitude"?: number,"longitude"?: number,"owner_id"?: string,"photo_path"?: string | null,"price"?: number,"published_at"?: string | null,"rooms"?: number,"smartcheck_score"?: number | null,"status"?: Database["public"]['Enums']["listing_status"],"street_label"?: string,"title"?: string,"transaction"?: Database["public"]['Enums']["listing_transaction"],"updated_at"?: string,"verification"?: Database["public"]['Enums']["listing_verification"]
                  }
                  Relationships: [
                    
                  ]
                },"online_reports": {
                  Row: {
                    "address_text": string,"category_scores": NonNullable<Json>,"city_id": string,"created_at": string,"declared_area_m2": number | null,"declared_building_floors": number | null,"declared_construction_year": number | null,"declared_floor": number | null,"declared_has_elevator": boolean | null,"declared_rooms": number | null,"error_code": string | null,"generated_at": string | null,"id": string,"latitude": number | null,"locale": string,"location": unknown,"longitude": number | null,"number": number,"overall_score": number | null,"owner_id": string,"pdf_path": string | null,"result": NonNullable<Json>,"scoring_version_id": string | null,"snapshot_id": string | null,"source_listing_url": string | null,"status": Database["public"]['Enums']["online_report_status"],"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "address_text": string,"category_scores"?: NonNullable<Json>,"city_id": string,"created_at"?: string,"declared_area_m2"?: number | null,"declared_building_floors"?: number | null,"declared_construction_year"?: number | null,"declared_floor"?: number | null,"declared_has_elevator"?: boolean | null,"declared_rooms"?: number | null,"error_code"?: string | null,"generated_at"?: string | null,"id"?: string,"latitude"?: never,"locale"?: string,"location": unknown,"longitude"?: never,"number"?: never,"overall_score"?: number | null,"owner_id"?: string,"pdf_path"?: string | null,"result"?: NonNullable<Json>,"scoring_version_id"?: string | null,"snapshot_id"?: string | null,"source_listing_url"?: string | null,"status"?: Database["public"]['Enums']["online_report_status"],"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "address_text"?: string,"category_scores"?: NonNullable<Json>,"city_id"?: string,"created_at"?: string,"declared_area_m2"?: number | null,"declared_building_floors"?: number | null,"declared_construction_year"?: number | null,"declared_floor"?: number | null,"declared_has_elevator"?: boolean | null,"declared_rooms"?: number | null,"error_code"?: string | null,"generated_at"?: string | null,"id"?: string,"latitude"?: never,"locale"?: string,"location"?: unknown,"longitude"?: never,"number"?: never,"overall_score"?: number | null,"owner_id"?: string,"pdf_path"?: string | null,"result"?: NonNullable<Json>,"scoring_version_id"?: string | null,"snapshot_id"?: string | null,"source_listing_url"?: string | null,"status"?: Database["public"]['Enums']["online_report_status"],"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "online_reports_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "online_reports_scoring_version_id_fkey"
      columns: ["scoring_version_id"]
isOneToOne: false
      referencedRelation: "scoring_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "online_reports_snapshot_id_fkey"
      columns: ["snapshot_id"]
isOneToOne: false
      referencedRelation: "score_snapshots"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string | null,"id": string,"locale": string,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string | null,"id": string,"locale"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string | null,"id"?: string,"locale"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"report_share_links": {
                  Row: {
                    "created_at": string,"expires_at": string | null,"id": string,"online_report_id": string,"owner_id": string,"revoked_at": string | null,"token_hash": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at"?: string | null,"id"?: string,"online_report_id": string,"owner_id"?: string,"revoked_at"?: string | null,"token_hash": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string | null,"id"?: string,"online_report_id"?: string,"owner_id"?: string,"revoked_at"?: string | null,"token_hash"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "report_share_links_online_report_id_fkey"
      columns: ["online_report_id"]
isOneToOne: false
      referencedRelation: "online_reports"
      referencedColumns: ["id"]
    }
                  ]
                },"score_snapshots": {
                  Row: {
                    "created_at": string,"error_code": string | null,"finished_at": string | null,"id": string,"period": string,"scoring_version_id": string,"source_dates": NonNullable<Json>,"started_at": string,"stats": NonNullable<Json>,"status": Database["public"]['Enums']["snapshot_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"error_code"?: string | null,"finished_at"?: string | null,"id"?: string,"period": string,"scoring_version_id": string,"source_dates"?: NonNullable<Json>,"started_at"?: string,"stats"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["snapshot_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"error_code"?: string | null,"finished_at"?: string | null,"id"?: string,"period"?: string,"scoring_version_id"?: string,"source_dates"?: NonNullable<Json>,"started_at"?: string,"stats"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["snapshot_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "score_snapshots_scoring_version_id_fkey"
      columns: ["scoring_version_id"]
isOneToOne: false
      referencedRelation: "scoring_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"scoring_versions": {
                  Row: {
                    "activated_at": string | null,"created_at": string,"created_by": string | null,"id": string,"is_active": boolean,"kind": Database["public"]['Enums']["scoring_kind"],"label": string,"params": NonNullable<Json>,"updated_at": string,"weights": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"kind": Database["public"]['Enums']["scoring_kind"],"label": string,"params"?: NonNullable<Json>,"updated_at"?: string,"weights"?: NonNullable<Json>
                  }
                  Update: {
                    "activated_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["scoring_kind"],"label"?: string,"params"?: NonNullable<Json>,"updated_at"?: string,"weights"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"granted_by": string | null,"id": string,"role": Database["public"]['Enums']["app_role"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"granted_by"?: string | null,"id"?: string,"role": Database["public"]['Enums']["app_role"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"granted_by"?: string | null,"id"?: string,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "account_has_password":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"create_report_share_link":
{ Args: { "p_expires_in_days"?: number,"p_report_id": string }; Returns: string
                           },
"custom_access_token_hook":
{ Args: { "event": Json }; Returns: Json
                           },
"delete_own_account":
{ Args: { "confirmation": string }; Returns: string
                           },
"resolve_report_share_link":
{ Args: { "p_report_id": string,"p_token": string }; Returns: {
              "address_text": string,"created_at": string,"declared_area_m2": number,"declared_building_floors": number,"declared_construction_year": number,"declared_floor": number,"declared_rooms": number,"generated_at": string,"id": string,"latitude": number,"longitude": number,"number": number,"overall_score": number,"result": Json,"status": Database["public"]['Enums']["online_report_status"]
            }[]
                           },
"revoke_report_share_link":
{ Args: { "p_report_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "user"|"admin","listing_status": "draft"|"published","listing_transaction": "sale"|"rent","listing_verification": "physical"|"smartcheck"|"none","online_report_status": "pending_payment"|"generating"|"ready"|"failed","scoring_kind": "online"|"inspection","snapshot_status": "building"|"ready"|"failed"|"superseded"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["user", "admin"],"listing_status": ["draft", "published"],"listing_transaction": ["sale", "rent"],"listing_verification": ["physical", "smartcheck", "none"],"online_report_status": ["pending_payment", "generating", "ready", "failed"],"scoring_kind": ["online", "inspection"],"snapshot_status": ["building", "ready", "failed", "superseded"]
          }
        }
} as const
