
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
                },"listing_decisions": {
                  Row: {
                    "created_at": string,"decided_by": string | null,"decision": Database["public"]['Enums']["listing_decision"],"id": string,"listing_id": string,"message": string | null,"reasons": (Database["public"]['Enums']["listing_decision_reason"])[]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decided_by"?: string | null,"decision": Database["public"]['Enums']["listing_decision"],"id"?: string,"listing_id": string,"message"?: string | null,"reasons"?: (Database["public"]['Enums']["listing_decision_reason"])[]
                  }
                  Update: {
                    "created_at"?: string,"decided_by"?: string | null,"decision"?: Database["public"]['Enums']["listing_decision"],"id"?: string,"listing_id"?: string,"message"?: string | null,"reasons"?: (Database["public"]['Enums']["listing_decision_reason"])[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_decisions_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_photos": {
                  Row: {
                    "created_at": string,"id": string,"listing_id": string,"owner_id": string,"path": string,"position": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"listing_id": string,"owner_id"?: string,"path": string,"position": number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"listing_id"?: string,"owner_id"?: string,"path"?: string,"position"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_photos_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listings": {
                  Row: {
                    "area_m2": number,"balconies": number | null,"bathrooms": number | null,"building_floors": number | null,"building_services": (Database["public"]['Enums']["listing_building_service"])[],"building_type": Database["public"]['Enums']["listing_building_type"] | null,"city": string,"comfort": Database["public"]['Enums']["listing_comfort"] | null,"cooling": Database["public"]['Enums']["listing_cooling"] | null,"created_at": string,"currency": string,"decided_at": string | null,"description": string | null,"floor": number | null,"furnishing": Database["public"]['Enums']["listing_furnishing"] | null,"has_attic": boolean,"has_basement": boolean,"has_elevator": boolean,"has_semibasement": boolean,"has_shared_yard": boolean,"heating": Database["public"]['Enums']["listing_heating"] | null,"house_type": Database["public"]['Enums']["listing_house_type"] | null,"id": string,"interior_condition": Database["public"]['Enums']["listing_interior_condition"] | null,"is_passive_house": boolean,"land_area_m2": number | null,"latitude": number,"longitude": number,"owner_id": string,"parking_spaces": number | null,"partitioning": Database["public"]['Enums']["listing_partitioning"] | null,"pets": Database["public"]['Enums']["listing_pets"] | null,"photo_path": string | null,"pool": Database["public"]['Enums']["listing_pool"] | null,"price": number,"property_type": Database["public"]['Enums']["listing_property_type"],"published_at": string | null,"revision_of": string | null,"rooms": number,"smartcheck_score": number | null,"status": Database["public"]['Enums']["listing_status"],"street_label": string,"submitted_at": string | null,"title": string,"transaction": Database["public"]['Enums']["listing_transaction"],"updated_at": string,"utilities": (Database["public"]['Enums']["listing_utility"])[],"verification": Database["public"]['Enums']["listing_verification"],"yard": Database["public"]['Enums']["listing_yard"] | null,"year_built": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area_m2": number,"balconies"?: number | null,"bathrooms"?: number | null,"building_floors"?: number | null,"building_services"?: (Database["public"]['Enums']["listing_building_service"])[],"building_type"?: Database["public"]['Enums']["listing_building_type"] | null,"city": string,"comfort"?: Database["public"]['Enums']["listing_comfort"] | null,"cooling"?: Database["public"]['Enums']["listing_cooling"] | null,"created_at"?: string,"currency": string,"decided_at"?: string | null,"description"?: string | null,"floor"?: number | null,"furnishing"?: Database["public"]['Enums']["listing_furnishing"] | null,"has_attic"?: boolean,"has_basement"?: boolean,"has_elevator"?: boolean,"has_semibasement"?: boolean,"has_shared_yard"?: boolean,"heating"?: Database["public"]['Enums']["listing_heating"] | null,"house_type"?: Database["public"]['Enums']["listing_house_type"] | null,"id"?: string,"interior_condition"?: Database["public"]['Enums']["listing_interior_condition"] | null,"is_passive_house"?: boolean,"land_area_m2"?: number | null,"latitude": number,"longitude": number,"owner_id"?: string,"parking_spaces"?: number | null,"partitioning"?: Database["public"]['Enums']["listing_partitioning"] | null,"pets"?: Database["public"]['Enums']["listing_pets"] | null,"photo_path"?: string | null,"pool"?: Database["public"]['Enums']["listing_pool"] | null,"price": number,"property_type"?: Database["public"]['Enums']["listing_property_type"],"published_at"?: string | null,"revision_of"?: string | null,"rooms": number,"smartcheck_score"?: number | null,"status"?: Database["public"]['Enums']["listing_status"],"street_label": string,"submitted_at"?: string | null,"title": string,"transaction": Database["public"]['Enums']["listing_transaction"],"updated_at"?: string,"utilities"?: (Database["public"]['Enums']["listing_utility"])[],"verification"?: Database["public"]['Enums']["listing_verification"],"yard"?: Database["public"]['Enums']["listing_yard"] | null,"year_built"?: number | null
                  }
                  Update: {
                    "area_m2"?: number,"balconies"?: number | null,"bathrooms"?: number | null,"building_floors"?: number | null,"building_services"?: (Database["public"]['Enums']["listing_building_service"])[],"building_type"?: Database["public"]['Enums']["listing_building_type"] | null,"city"?: string,"comfort"?: Database["public"]['Enums']["listing_comfort"] | null,"cooling"?: Database["public"]['Enums']["listing_cooling"] | null,"created_at"?: string,"currency"?: string,"decided_at"?: string | null,"description"?: string | null,"floor"?: number | null,"furnishing"?: Database["public"]['Enums']["listing_furnishing"] | null,"has_attic"?: boolean,"has_basement"?: boolean,"has_elevator"?: boolean,"has_semibasement"?: boolean,"has_shared_yard"?: boolean,"heating"?: Database["public"]['Enums']["listing_heating"] | null,"house_type"?: Database["public"]['Enums']["listing_house_type"] | null,"id"?: string,"interior_condition"?: Database["public"]['Enums']["listing_interior_condition"] | null,"is_passive_house"?: boolean,"land_area_m2"?: number | null,"latitude"?: number,"longitude"?: number,"owner_id"?: string,"parking_spaces"?: number | null,"partitioning"?: Database["public"]['Enums']["listing_partitioning"] | null,"pets"?: Database["public"]['Enums']["listing_pets"] | null,"photo_path"?: string | null,"pool"?: Database["public"]['Enums']["listing_pool"] | null,"price"?: number,"property_type"?: Database["public"]['Enums']["listing_property_type"],"published_at"?: string | null,"revision_of"?: string | null,"rooms"?: number,"smartcheck_score"?: number | null,"status"?: Database["public"]['Enums']["listing_status"],"street_label"?: string,"submitted_at"?: string | null,"title"?: string,"transaction"?: Database["public"]['Enums']["listing_transaction"],"updated_at"?: string,"utilities"?: (Database["public"]['Enums']["listing_utility"])[],"verification"?: Database["public"]['Enums']["listing_verification"],"yard"?: Database["public"]['Enums']["listing_yard"] | null,"year_built"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_owner_profile_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_revision_of_fkey"
      columns: ["revision_of"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
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
"decide_listing":
{ Args: { "p_decision": Database["public"]['Enums']["listing_decision"],"p_listing_id": string,"p_message": string,"p_reasons": (Database["public"]['Enums']["listing_decision_reason"])[] }; Returns: {
              "created_at": string,
"decided_by": string | null,
"decision": Database["public"]['Enums']["listing_decision"],
"id": string,
"listing_id": string,
"message": string | null,
"reasons": (Database["public"]['Enums']["listing_decision_reason"])[]
            }
                          SetofOptions: {
        from: "*"
        to: "listing_decisions"
        isOneToOne: true
        isSetofReturn: false
      } },
"delete_own_account":
{ Args: { "confirmation": string }; Returns: string
                           },
"discard_listing_revision":
{ Args: { "p_revision_id": string }; Returns: undefined
                           },
"listing_moderation_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "status": Database["public"]['Enums']["listing_status"],"total": number
            }[]
                           },
"reorder_listing_photos":
{ Args: { "p_listing_id": string,"p_photo_ids": (string)[] }; Returns: undefined
                           },
"resolve_report_share_link":
{ Args: { "p_report_id": string,"p_token": string }; Returns: {
              "address_text": string,"created_at": string,"declared_area_m2": number,"declared_building_floors": number,"declared_construction_year": number,"declared_floor": number,"declared_rooms": number,"generated_at": string,"id": string,"latitude": number,"longitude": number,"number": number,"overall_score": number,"result": Json,"status": Database["public"]['Enums']["online_report_status"]
            }[]
                           },
"revoke_report_share_link":
{ Args: { "p_report_id": string }; Returns: undefined
                           },
"start_listing_revision":
{ Args: { "p_listing_id": string }; Returns: string
                           },
"submit_listing":
{ Args: { "p_listing_id": string }; Returns: {
              "area_m2": number,
"balconies": number | null,
"bathrooms": number | null,
"building_floors": number | null,
"building_services": (Database["public"]['Enums']["listing_building_service"])[],
"building_type": Database["public"]['Enums']["listing_building_type"] | null,
"city": string,
"comfort": Database["public"]['Enums']["listing_comfort"] | null,
"cooling": Database["public"]['Enums']["listing_cooling"] | null,
"created_at": string,
"currency": string,
"decided_at": string | null,
"description": string | null,
"floor": number | null,
"furnishing": Database["public"]['Enums']["listing_furnishing"] | null,
"has_attic": boolean,
"has_basement": boolean,
"has_elevator": boolean,
"has_semibasement": boolean,
"has_shared_yard": boolean,
"heating": Database["public"]['Enums']["listing_heating"] | null,
"house_type": Database["public"]['Enums']["listing_house_type"] | null,
"id": string,
"interior_condition": Database["public"]['Enums']["listing_interior_condition"] | null,
"is_passive_house": boolean,
"land_area_m2": number | null,
"latitude": number,
"longitude": number,
"owner_id": string,
"parking_spaces": number | null,
"partitioning": Database["public"]['Enums']["listing_partitioning"] | null,
"pets": Database["public"]['Enums']["listing_pets"] | null,
"photo_path": string | null,
"pool": Database["public"]['Enums']["listing_pool"] | null,
"price": number,
"property_type": Database["public"]['Enums']["listing_property_type"],
"published_at": string | null,
"revision_of": string | null,
"rooms": number,
"smartcheck_score": number | null,
"status": Database["public"]['Enums']["listing_status"],
"street_label": string,
"submitted_at": string | null,
"title": string,
"transaction": Database["public"]['Enums']["listing_transaction"],
"updated_at": string,
"utilities": (Database["public"]['Enums']["listing_utility"])[],
"verification": Database["public"]['Enums']["listing_verification"],
"yard": Database["public"]['Enums']["listing_yard"] | null,
"year_built": number | null
            }
                          SetofOptions: {
        from: "*"
        to: "listings"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "app_role": "user"|"admin","listing_building_service": "administration"|"cleaning"|"security"|"video_surveillance","listing_building_type": "apartment_block"|"house_villa","listing_comfort": "first"|"second"|"third"|"luxury","listing_cooling": "air_conditioning"|"fan_heaters"|"fan_coils","listing_decision": "approved"|"rejected"|"blocked","listing_decision_reason": "photos"|"personal_data"|"price_area"|"description"|"contact_details"|"duplicate"|"unavailable"|"rules","listing_furnishing": "furnished"|"unfurnished"|"partly_furnished","listing_heating": "building_boiler"|"own_boiler"|"convector"|"infrared_panels"|"district_heating"|"heat_pump"|"solar_panels","listing_house_type": "detached"|"duplex"|"triplex"|"terraced"|"other","listing_interior_condition": "renovated"|"good"|"needs_renovation","listing_partitioning": "detached"|"semi_detached"|"non_detached"|"circular","listing_pets": "allowed"|"not_allowed","listing_pool": "own"|"shared","listing_property_type": "apartment"|"house","listing_status": "draft"|"pending_approval"|"approved"|"rejected"|"blocked","listing_transaction": "sale"|"rent","listing_utility": "water"|"sewerage"|"gas"|"electricity"|"cable_tv"|"internet","listing_verification": "physical"|"smartcheck"|"none","listing_yard": "yard"|"shared_yard"|"garden","online_report_status": "pending_payment"|"generating"|"ready"|"failed","scoring_kind": "online"|"inspection","snapshot_status": "building"|"ready"|"failed"|"superseded"
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
            "app_role": ["user", "admin"],"listing_building_service": ["administration", "cleaning", "security", "video_surveillance"],"listing_building_type": ["apartment_block", "house_villa"],"listing_comfort": ["first", "second", "third", "luxury"],"listing_cooling": ["air_conditioning", "fan_heaters", "fan_coils"],"listing_decision": ["approved", "rejected", "blocked"],"listing_decision_reason": ["photos", "personal_data", "price_area", "description", "contact_details", "duplicate", "unavailable", "rules"],"listing_furnishing": ["furnished", "unfurnished", "partly_furnished"],"listing_heating": ["building_boiler", "own_boiler", "convector", "infrared_panels", "district_heating", "heat_pump", "solar_panels"],"listing_house_type": ["detached", "duplex", "triplex", "terraced", "other"],"listing_interior_condition": ["renovated", "good", "needs_renovation"],"listing_partitioning": ["detached", "semi_detached", "non_detached", "circular"],"listing_pets": ["allowed", "not_allowed"],"listing_pool": ["own", "shared"],"listing_property_type": ["apartment", "house"],"listing_status": ["draft", "pending_approval", "approved", "rejected", "blocked"],"listing_transaction": ["sale", "rent"],"listing_utility": ["water", "sewerage", "gas", "electricity", "cable_tv", "internet"],"listing_verification": ["physical", "smartcheck", "none"],"listing_yard": ["yard", "shared_yard", "garden"],"online_report_status": ["pending_payment", "generating", "ready", "failed"],"scoring_kind": ["online", "inspection"],"snapshot_status": ["building", "ready", "failed", "superseded"]
          }
        }
} as const
