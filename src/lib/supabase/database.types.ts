
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
                },"consent_sections": {
                  Row: {
                    "check_en": string,"check_ro": string,"consent_version_id": string,"created_at": string,"id": string,"position": number,"text_en": string,"text_ro": string,"title_en": string,"title_ro": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "check_en"?: string,"check_ro"?: string,"consent_version_id": string,"created_at"?: string,"id"?: string,"position": number,"text_en"?: string,"text_ro"?: string,"title_en"?: string,"title_ro"?: string,"updated_at"?: string
                  }
                  Update: {
                    "check_en"?: string,"check_ro"?: string,"consent_version_id"?: string,"created_at"?: string,"id"?: string,"position"?: number,"text_en"?: string,"text_ro"?: string,"title_en"?: string,"title_ro"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consent_sections_consent_version_id_fkey"
      columns: ["consent_version_id"]
isOneToOne: false
      referencedRelation: "consent_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"consent_versions": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"created_by": string | null,"id": string,"published_at": string | null,"published_by": string | null,"status": Database["public"]['Enums']["form_version_status"],"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"published_at"?: string | null,"published_by"?: string | null,"status"?: Database["public"]['Enums']["form_version_status"],"updated_at"?: string,"version": number
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"published_at"?: string | null,"published_by"?: string | null,"status"?: Database["public"]['Enums']["form_version_status"],"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"favorite_listings": {
                  Row: {
                    "created_at": string,"id": string,"listing_id": string,"owner_id": string,"saved_photo_path": string | null,"saved_title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"listing_id": string,"owner_id"?: string,"saved_photo_path"?: string | null,"saved_title"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"listing_id"?: string,"owner_id"?: string,"saved_photo_path"?: string | null,"saved_title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorite_listings_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"inspection_answers": {
                  Row: {
                    "answer": Database["public"]['Enums']["inspection_answer"] | null,"answered_by": string | null,"created_at": string,"id": string,"inspection_id": string,"note": string,"question_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer"?: Database["public"]['Enums']["inspection_answer"] | null,"answered_by"?: string | null,"created_at"?: string,"id"?: string,"inspection_id": string,"note"?: string,"question_id": string,"updated_at"?: string
                  }
                  Update: {
                    "answer"?: Database["public"]['Enums']["inspection_answer"] | null,"answered_by"?: string | null,"created_at"?: string,"id"?: string,"inspection_id"?: string,"note"?: string,"question_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspection_answers_inspection_id_fkey"
      columns: ["inspection_id"]
isOneToOne: false
      referencedRelation: "inspections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inspection_answers_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "inspection_form_questions"
      referencedColumns: ["id"]
    }
                  ]
                },"inspection_consents": {
                  Row: {
                    "consent_version_id": string,"created_at": string,"created_by": string | null,"inspection_id": string,"language": string,"latitude": number | null,"longitude": number | null,"sections_snapshot": NonNullable<Json>,"signature_path": string,"signed_at": string,"signer_name": string,"signer_role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_version_id": string,"created_at"?: string,"created_by"?: string | null,"inspection_id": string,"language": string,"latitude"?: number | null,"longitude"?: number | null,"sections_snapshot": NonNullable<Json>,"signature_path": string,"signed_at"?: string,"signer_name": string,"signer_role"?: string
                  }
                  Update: {
                    "consent_version_id"?: string,"created_at"?: string,"created_by"?: string | null,"inspection_id"?: string,"language"?: string,"latitude"?: number | null,"longitude"?: number | null,"sections_snapshot"?: NonNullable<Json>,"signature_path"?: string,"signed_at"?: string,"signer_name"?: string,"signer_role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspection_consents_consent_version_id_fkey"
      columns: ["consent_version_id"]
isOneToOne: false
      referencedRelation: "consent_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inspection_consents_inspection_id_fkey"
      columns: ["inspection_id"]
isOneToOne: true
      referencedRelation: "inspections"
      referencedColumns: ["id"]
    }
                  ]
                },"inspection_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"id": string,"inspection_id": string,"kind": Database["public"]['Enums']["inspection_event_kind"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"inspection_id": string,"kind": Database["public"]['Enums']["inspection_event_kind"]
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"inspection_id"?: string,"kind"?: Database["public"]['Enums']["inspection_event_kind"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspection_events_inspection_id_fkey"
      columns: ["inspection_id"]
isOneToOne: false
      referencedRelation: "inspections"
      referencedColumns: ["id"]
    }
                  ]
                },"inspection_form_categories": {
                  Row: {
                    "created_at": string,"form_version_id": string,"icon": string,"id": string,"key": string,"name_en": string,"name_ro": string,"position": number,"updated_at": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"form_version_id": string,"icon"?: string,"id"?: string,"key": string,"name_en"?: string,"name_ro": string,"position": number,"updated_at"?: string,"weight"?: number
                  }
                  Update: {
                    "created_at"?: string,"form_version_id"?: string,"icon"?: string,"id"?: string,"key"?: string,"name_en"?: string,"name_ro"?: string,"position"?: number,"updated_at"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspection_form_categories_form_version_id_fkey"
      columns: ["form_version_id"]
isOneToOne: false
      referencedRelation: "inspection_form_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"inspection_form_questions": {
                  Row: {
                    "category_id": string,"created_at": string,"form_version_id": string,"id": string,"key": string,"position": number,"required_media": Database["public"]['Enums']["inspection_required_media"],"text_en": string,"text_ro": string,"updated_at": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"created_at"?: string,"form_version_id": string,"id"?: string,"key": string,"position": number,"required_media"?: Database["public"]['Enums']["inspection_required_media"],"text_en"?: string,"text_ro"?: string,"updated_at"?: string,"weight"?: number
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"form_version_id"?: string,"id"?: string,"key"?: string,"position"?: number,"required_media"?: Database["public"]['Enums']["inspection_required_media"],"text_en"?: string,"text_ro"?: string,"updated_at"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspection_form_questions_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "inspection_form_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inspection_form_questions_form_version_id_fkey"
      columns: ["form_version_id"]
isOneToOne: false
      referencedRelation: "inspection_form_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"inspection_form_versions": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"created_by": string | null,"id": string,"points_acceptable": number,"points_good": number,"points_problem": number,"published_at": string | null,"published_by": string | null,"status": Database["public"]['Enums']["form_version_status"],"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"points_acceptable"?: number,"points_good"?: number,"points_problem"?: number,"published_at"?: string | null,"published_by"?: string | null,"status"?: Database["public"]['Enums']["form_version_status"],"updated_at"?: string,"version": number
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"points_acceptable"?: number,"points_good"?: number,"points_problem"?: number,"published_at"?: string | null,"published_by"?: string | null,"status"?: Database["public"]['Enums']["form_version_status"],"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"inspection_media": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"inspection_id": string,"kind": Database["public"]['Enums']["inspection_media_kind"],"mime_type": string,"path": string,"question_id": string,"size_bytes": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"inspection_id": string,"kind": Database["public"]['Enums']["inspection_media_kind"],"mime_type": string,"path": string,"question_id": string,"size_bytes": number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"inspection_id"?: string,"kind"?: Database["public"]['Enums']["inspection_media_kind"],"mime_type"?: string,"path"?: string,"question_id"?: string,"size_bytes"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspection_media_inspection_id_fkey"
      columns: ["inspection_id"]
isOneToOne: false
      referencedRelation: "inspections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inspection_media_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "inspection_form_questions"
      referencedColumns: ["id"]
    }
                  ]
                },"inspections": {
                  Row: {
                    "access_mode": Database["public"]['Enums']["inspection_access_mode"],"access_name": string,"access_notes": string | null,"access_phone": string,"access_tags": (string)[],"assigned_at": string | null,"cancel_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"category_scores": Json | null,"completion_confirmed_by": string | null,"consent_version_id": string | null,"created_at": string,"currency": string,"ends_at": string,"form_version_id": string | null,"id": string,"inspector_id": string | null,"number": number,"partner_code": string | null,"payment_method": Database["public"]['Enums']["inspection_payment_method"],"payment_status": Database["public"]['Enums']["inspection_payment_status"],"price": number,"property_id": string,"requested_by": string,"score": number | null,"started_at": string | null,"starts_at": string,"status": Database["public"]['Enums']["inspection_status"],"submitted_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_mode": Database["public"]['Enums']["inspection_access_mode"],"access_name": string,"access_notes"?: string | null,"access_phone": string,"access_tags"?: (string)[],"assigned_at"?: string | null,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"category_scores"?: Json | null,"completion_confirmed_by"?: string | null,"consent_version_id"?: string | null,"created_at"?: string,"currency"?: string,"ends_at": string,"form_version_id"?: string | null,"id"?: string,"inspector_id"?: string | null,"number"?: number,"partner_code"?: string | null,"payment_method": Database["public"]['Enums']["inspection_payment_method"],"payment_status"?: Database["public"]['Enums']["inspection_payment_status"],"price"?: number,"property_id": string,"requested_by": string,"score"?: number | null,"started_at"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["inspection_status"],"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "access_mode"?: Database["public"]['Enums']["inspection_access_mode"],"access_name"?: string,"access_notes"?: string | null,"access_phone"?: string,"access_tags"?: (string)[],"assigned_at"?: string | null,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"category_scores"?: Json | null,"completion_confirmed_by"?: string | null,"consent_version_id"?: string | null,"created_at"?: string,"currency"?: string,"ends_at"?: string,"form_version_id"?: string | null,"id"?: string,"inspector_id"?: string | null,"number"?: number,"partner_code"?: string | null,"payment_method"?: Database["public"]['Enums']["inspection_payment_method"],"payment_status"?: Database["public"]['Enums']["inspection_payment_status"],"price"?: number,"property_id"?: string,"requested_by"?: string,"score"?: number | null,"started_at"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["inspection_status"],"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspections_consent_version_id_fkey"
      columns: ["consent_version_id"]
isOneToOne: false
      referencedRelation: "consent_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inspections_form_version_id_fkey"
      columns: ["form_version_id"]
isOneToOne: false
      referencedRelation: "inspection_form_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inspections_inspector_id_fkey"
      columns: ["inspector_id"]
isOneToOne: false
      referencedRelation: "inspector_profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "inspections_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"inspector_exceptions": {
                  Row: {
                    "created_at": string,"ends_at": string,"id": string,"inspector_id": string,"kind": Database["public"]['Enums']["inspector_exception_kind"],"note": string | null,"starts_at": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at": string,"id"?: string,"inspector_id": string,"kind": Database["public"]['Enums']["inspector_exception_kind"],"note"?: string | null,"starts_at": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"id"?: string,"inspector_id"?: string,"kind"?: Database["public"]['Enums']["inspector_exception_kind"],"note"?: string | null,"starts_at"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspector_exceptions_inspector_id_fkey"
      columns: ["inspector_id"]
isOneToOne: false
      referencedRelation: "inspector_profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"inspector_profiles": {
                  Row: {
                    "city_id": string,"created_at": string,"is_active": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city_id": string,"created_at"?: string,"is_active"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "city_id"?: string,"created_at"?: string,"is_active"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspector_profiles_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    }
                  ]
                },"inspector_weekly_hours": {
                  Row: {
                    "created_at": string,"ends_at": string,"id": string,"inspector_id": string,"starts_at": string,"updated_at": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at": string,"id"?: string,"inspector_id": string,"starts_at": string,"updated_at"?: string,"weekday": number
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"id"?: string,"inspector_id"?: string,"starts_at"?: string,"updated_at"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspector_weekly_hours_inspector_id_fkey"
      columns: ["inspector_id"]
isOneToOne: false
      referencedRelation: "inspector_profiles"
      referencedColumns: ["user_id"]
    }
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
                    "area_m2": number,"balconies": number | null,"bathrooms": number | null,"building_floors": number | null,"building_services": (Database["public"]['Enums']["listing_building_service"])[],"building_type": Database["public"]['Enums']["listing_building_type"] | null,"city": string,"comfort": Database["public"]['Enums']["listing_comfort"] | null,"cooling": Database["public"]['Enums']["listing_cooling"] | null,"county_id": string | null,"created_at": string,"currency": string,"decided_at": string | null,"description": string | null,"floor": number | null,"furnishing": Database["public"]['Enums']["listing_furnishing"] | null,"has_attic": boolean,"has_basement": boolean,"has_elevator": boolean,"has_semibasement": boolean,"has_shared_yard": boolean,"heating": Database["public"]['Enums']["listing_heating"] | null,"house_type": Database["public"]['Enums']["listing_house_type"] | null,"id": string,"interior_condition": Database["public"]['Enums']["listing_interior_condition"] | null,"is_passive_house": boolean,"land_area_m2": number | null,"latitude": number,"location_3857": unknown,"longitude": number,"owner_id": string,"parking_spaces": number | null,"partitioning": Database["public"]['Enums']["listing_partitioning"] | null,"pets": Database["public"]['Enums']["listing_pets"] | null,"photo_path": string | null,"pool": Database["public"]['Enums']["listing_pool"] | null,"price": number,"price_band": number | null,"property_type": Database["public"]['Enums']["listing_property_type"],"published_at": string | null,"revision_of": string | null,"rooms": number,"smartcheck_score": number | null,"status": Database["public"]['Enums']["listing_status"],"street_label": string,"submitted_at": string | null,"title": string,"transaction": Database["public"]['Enums']["listing_transaction"],"updated_at": string,"utilities": (Database["public"]['Enums']["listing_utility"])[],"verification": Database["public"]['Enums']["listing_verification"],"yard": Database["public"]['Enums']["listing_yard"] | null,"year_built": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area_m2": number,"balconies"?: number | null,"bathrooms"?: number | null,"building_floors"?: number | null,"building_services"?: (Database["public"]['Enums']["listing_building_service"])[],"building_type"?: Database["public"]['Enums']["listing_building_type"] | null,"city": string,"comfort"?: Database["public"]['Enums']["listing_comfort"] | null,"cooling"?: Database["public"]['Enums']["listing_cooling"] | null,"county_id"?: string | null,"created_at"?: string,"currency": string,"decided_at"?: string | null,"description"?: string | null,"floor"?: number | null,"furnishing"?: Database["public"]['Enums']["listing_furnishing"] | null,"has_attic"?: boolean,"has_basement"?: boolean,"has_elevator"?: boolean,"has_semibasement"?: boolean,"has_shared_yard"?: boolean,"heating"?: Database["public"]['Enums']["listing_heating"] | null,"house_type"?: Database["public"]['Enums']["listing_house_type"] | null,"id"?: string,"interior_condition"?: Database["public"]['Enums']["listing_interior_condition"] | null,"is_passive_house"?: boolean,"land_area_m2"?: number | null,"latitude": number,"location_3857"?: never,"longitude": number,"owner_id"?: string,"parking_spaces"?: number | null,"partitioning"?: Database["public"]['Enums']["listing_partitioning"] | null,"pets"?: Database["public"]['Enums']["listing_pets"] | null,"photo_path"?: string | null,"pool"?: Database["public"]['Enums']["listing_pool"] | null,"price": number,"price_band"?: number | null,"property_type"?: Database["public"]['Enums']["listing_property_type"],"published_at"?: string | null,"revision_of"?: string | null,"rooms": number,"smartcheck_score"?: number | null,"status"?: Database["public"]['Enums']["listing_status"],"street_label": string,"submitted_at"?: string | null,"title": string,"transaction": Database["public"]['Enums']["listing_transaction"],"updated_at"?: string,"utilities"?: (Database["public"]['Enums']["listing_utility"])[],"verification"?: Database["public"]['Enums']["listing_verification"],"yard"?: Database["public"]['Enums']["listing_yard"] | null,"year_built"?: number | null
                  }
                  Update: {
                    "area_m2"?: number,"balconies"?: number | null,"bathrooms"?: number | null,"building_floors"?: number | null,"building_services"?: (Database["public"]['Enums']["listing_building_service"])[],"building_type"?: Database["public"]['Enums']["listing_building_type"] | null,"city"?: string,"comfort"?: Database["public"]['Enums']["listing_comfort"] | null,"cooling"?: Database["public"]['Enums']["listing_cooling"] | null,"county_id"?: string | null,"created_at"?: string,"currency"?: string,"decided_at"?: string | null,"description"?: string | null,"floor"?: number | null,"furnishing"?: Database["public"]['Enums']["listing_furnishing"] | null,"has_attic"?: boolean,"has_basement"?: boolean,"has_elevator"?: boolean,"has_semibasement"?: boolean,"has_shared_yard"?: boolean,"heating"?: Database["public"]['Enums']["listing_heating"] | null,"house_type"?: Database["public"]['Enums']["listing_house_type"] | null,"id"?: string,"interior_condition"?: Database["public"]['Enums']["listing_interior_condition"] | null,"is_passive_house"?: boolean,"land_area_m2"?: number | null,"latitude"?: number,"location_3857"?: never,"longitude"?: number,"owner_id"?: string,"parking_spaces"?: number | null,"partitioning"?: Database["public"]['Enums']["listing_partitioning"] | null,"pets"?: Database["public"]['Enums']["listing_pets"] | null,"photo_path"?: string | null,"pool"?: Database["public"]['Enums']["listing_pool"] | null,"price"?: number,"price_band"?: number | null,"property_type"?: Database["public"]['Enums']["listing_property_type"],"published_at"?: string | null,"revision_of"?: string | null,"rooms"?: number,"smartcheck_score"?: number | null,"status"?: Database["public"]['Enums']["listing_status"],"street_label"?: string,"submitted_at"?: string | null,"title"?: string,"transaction"?: Database["public"]['Enums']["listing_transaction"],"updated_at"?: string,"utilities"?: (Database["public"]['Enums']["listing_utility"])[],"verification"?: Database["public"]['Enums']["listing_verification"],"yard"?: Database["public"]['Enums']["listing_yard"] | null,"year_built"?: number | null
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
                },"properties": {
                  Row: {
                    "address_text": string,"area_m2": number,"building_floors": number | null,"city_id": string,"created_at": string,"floor": number | null,"id": string,"latitude": number,"listing_id": string | null,"longitude": number,"owner_id": string,"property_type": Database["public"]['Enums']["listing_property_type"],"updated_at": string,"year_built": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_text": string,"area_m2": number,"building_floors"?: number | null,"city_id": string,"created_at"?: string,"floor"?: number | null,"id"?: string,"latitude": number,"listing_id"?: string | null,"longitude": number,"owner_id"?: string,"property_type": Database["public"]['Enums']["listing_property_type"],"updated_at"?: string,"year_built"?: number | null
                  }
                  Update: {
                    "address_text"?: string,"area_m2"?: number,"building_floors"?: number | null,"city_id"?: string,"created_at"?: string,"floor"?: number | null,"id"?: string,"latitude"?: number,"listing_id"?: string | null,"longitude"?: number,"owner_id"?: string,"property_type"?: Database["public"]['Enums']["listing_property_type"],"updated_at"?: string,"year_built"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "properties_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "properties_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
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
"add_consent_section":
{ Args: { "p_consent_version_id": string }; Returns: string
                           },
"add_inspection_form_category":
{ Args: { "p_form_version_id": string,"p_icon": string,"p_name_en": string,"p_name_ro": string }; Returns: string
                           },
"add_inspection_form_question":
{ Args: { "p_category_id": string,"p_required_media": Database["public"]['Enums']["inspection_required_media"],"p_text_en": string,"p_text_ro": string }; Returns: string
                           },
"add_inspection_media":
{ Args: { "p_inspection_id": string,"p_kind": Database["public"]['Enums']["inspection_media_kind"],"p_mime_type": string,"p_path": string,"p_question_id": string,"p_size_bytes": number }; Returns: string
                           },
"admin_inspections":
{ Args: { "p_city_id"?: string,"p_from": string,"p_to": string,"p_unassigned_only"?: boolean }; Returns: {
              "access_mode": Database["public"]['Enums']["inspection_access_mode"],"access_name": string,"access_notes": string,"access_phone": string,"access_tags": (string)[],"address_text": string,"area_m2": number,"building_floors": number,"city_id": string,"city_name": string,"client_name": string,"client_phone": string,"created_at": string,"currency": string,"ends_at": string,"floor": number,"id": string,"inspector_id": string,"inspector_name": string,"number": number,"payment_status": Database["public"]['Enums']["inspection_payment_status"],"price": number,"property_type": Database["public"]['Enums']["listing_property_type"],"starts_at": string,"status": Database["public"]['Enums']["inspection_status"]
            }[]
                           },
"admin_inspectors":
{ Args: { "p_city_id"?: string }; Returns: {
              "city_id": string,"city_name": string,"full_name": string,"is_active": boolean,"phone": string,"user_id": string
            }[]
                           },
"admin_list_users":
{ Args: { "p_blocked"?: boolean,"p_city_id"?: string,"p_limit"?: number,"p_offset"?: number,"p_role"?: Database["public"]['Enums']["app_role"],"p_search": string }; Returns: {
              "block_reason": string,"created_at": string,"email": string,"full_name": string,"inspector_city_id": string,"inspector_city_name": string,"is_blocked": boolean,"phone": string,"roles": (Database["public"]['Enums']["app_role"])[],"total_count": number,"user_id": string
            }[]
                           },
"admin_unassigned_count":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"admin_user_role_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "amount": number,"role": Database["public"]['Enums']["app_role"],"total": number
            }[]
                           },
"assign_inspector":
{ Args: { "p_inspection_id": string,"p_inspector_id": string }; Returns: undefined
                           },
"block_user":
{ Args: { "p_reason": string,"p_user_id": string }; Returns: undefined
                           },
"book_inspection":
{ Args: { "p_access_mode": Database["public"]['Enums']["inspection_access_mode"],"p_access_name"?: string,"p_access_notes"?: string,"p_access_phone"?: string,"p_access_tags": (string)[],"p_address_text": string,"p_area_m2": number,"p_building_floors"?: number,"p_city_id": string,"p_floor"?: number,"p_latitude": number,"p_listing_id"?: string,"p_longitude": number,"p_payment_method": Database["public"]['Enums']["inspection_payment_method"],"p_property_id"?: string,"p_property_type": Database["public"]['Enums']["listing_property_type"],"p_starts_at": string,"p_year_built"?: number }; Returns: {
              "id": string,"number": number
            }[]
                           },
"cancel_inspection":
{ Args: { "p_inspection_id": string,"p_reason"?: string }; Returns: undefined
                           },
"consent_version_usage":
{ Args: Record<PropertyKey, never>; Returns: {
              "consent_version_id": string,"inspection_count": number
            }[]
                           },
"create_consent_draft":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"create_inspection_form_draft":
{ Args: Record<PropertyKey, never>; Returns: string
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
"delete_consent_version":
{ Args: { "p_consent_version_id": string }; Returns: undefined
                           },
"delete_inspection_form_version":
{ Args: { "p_form_version_id": string }; Returns: undefined
                           },
"delete_own_account":
{ Args: { "confirmation": string }; Returns: string
                           },
"discard_consent_draft":
{ Args: { "p_consent_version_id": string }; Returns: undefined
                           },
"discard_inspection_form_draft":
{ Args: { "p_form_version_id": string }; Returns: undefined
                           },
"discard_listing_revision":
{ Args: { "p_revision_id": string }; Returns: undefined
                           },
"inspection_cities":
{ Args: Record<PropertyKey, never>; Returns: {
              "has_inspectors": boolean,"id": string,"latitude": number,"longitude": number,"name": string,"slug": string
            }[]
                           },
"inspection_form_version_usage":
{ Args: Record<PropertyKey, never>; Returns: {
              "form_version_id": string,"inspection_count": number
            }[]
                           },
"inspection_history":
{ Args: { "p_inspection_id": string }; Returns: {
              "actor_name": string,"created_at": string,"details": Json,"kind": Database["public"]['Enums']["inspection_event_kind"]
            }[]
                           },
"inspection_progress":
{ Args: { "p_inspection_id": string }; Returns: Json
                           },
"inspection_slots":
{ Args: { "p_city_id": string,"p_from": string,"p_to": string }; Returns: {
              "free": number,"starts_at": string,"working": number
            }[]
                           },
"inspector_agenda":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "access_name": string,"access_notes": string,"access_phone": string,"access_tags": (string)[],"address_text": string,"answered_count": number,"area_m2": number,"building_floors": number,"city_name": string,"ends_at": string,"floor": number,"id": string,"latitude": number,"longitude": number,"number": number,"property_type": Database["public"]['Enums']["listing_property_type"],"question_count": number,"starts_at": string,"status": Database["public"]['Enums']["inspection_status"],"submitted_at": string,"year_built": number
            }[]
                           },
"inspector_workspace":
{ Args: { "p_inspection_id": string }; Returns: {
              "access_name": string,"access_phone": string,"address_text": string,"area_m2": number,"building_floors": number,"city_name": string,"consent_version_id": string,"ends_at": string,"floor": number,"form_version_id": string,"id": string,"inspector_name": string,"number": number,"property_type": Database["public"]['Enums']["listing_property_type"],"score": number,"started_at": string,"starts_at": string,"status": Database["public"]['Enums']["inspection_status"],"submitted_at": string,"year_built": number
            }[]
                           },
"list_my_favorite_listings":
{ Args: { "p_before_listing_id"?: string,"p_before_saved_at"?: string,"p_limit": number }; Returns: {
              "area_m2": number,"city": string,"currency": string,"is_available": boolean,"listing_id": string,"photo_path": string,"price": number,"rooms": number,"saved_at": string,"title": string,"total_count": number,"transaction": Database["public"]['Enums']["listing_transaction"]
            }[]
                           },
"listing_map_summary":
{ Args: { "p_max_price_eur"?: number,"p_transaction": Database["public"]['Enums']["listing_transaction"] }; Returns: {
              "county_id": string,"listing_count": number
            }[]
                           },
"listing_map_tile":
{ Args: { "p_max_price_eur"?: number,"p_transaction": Database["public"]['Enums']["listing_transaction"],"p_x": number,"p_y": number,"p_z": number }; Returns: unknown
                           },
"listing_moderation_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "status": Database["public"]['Enums']["listing_status"],"total": number
            }[]
                           },
"make_admin":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"move_inspection_form_question":
{ Args: { "p_category_id": string,"p_question_id": string }; Returns: undefined
                           },
"my_bookable_properties":
{ Args: Record<PropertyKey, never>; Returns: {
              "address_text": string,"area_m2": number,"building_floors": number,"city_id": string,"city_name": string,"floor": number,"last_inspection_at": string,"latitude": number,"listing_currency": string,"listing_id": string,"listing_price": number,"listing_status": Database["public"]['Enums']["listing_status"],"listing_transaction": Database["public"]['Enums']["listing_transaction"],"longitude": number,"photo_path": string,"property_id": string,"property_type": Database["public"]['Enums']["listing_property_type"],"rooms": number,"year_built": number
            }[]
                           },
"my_inspections":
{ Args: Record<PropertyKey, never>; Returns: {
              "access_mode": Database["public"]['Enums']["inspection_access_mode"],"access_name": string,"access_notes": string,"access_phone": string,"access_tags": (string)[],"address_text": string,"area_m2": number,"assigned_at": string,"building_floors": number,"cancelled_at": string,"city_id": string,"city_name": string,"created_at": string,"currency": string,"ends_at": string,"floor": number,"id": string,"inspector_name": string,"number": number,"payment_status": Database["public"]['Enums']["inspection_payment_status"],"price": number,"property_type": Database["public"]['Enums']["listing_property_type"],"starts_at": string,"status": Database["public"]['Enums']["inspection_status"]
            }[]
                           },
"publish_consent_version":
{ Args: { "p_consent_version_id": string }; Returns: undefined
                           },
"publish_inspection_form":
{ Args: { "p_form_version_id": string }; Returns: undefined
                           },
"remove_consent_section":
{ Args: { "p_section_id": string }; Returns: undefined
                           },
"remove_inspection_form_category":
{ Args: { "p_category_id": string }; Returns: undefined
                           },
"remove_inspection_form_question":
{ Args: { "p_question_id": string }; Returns: undefined
                           },
"remove_inspection_media":
{ Args: { "p_media_id": string }; Returns: string
                           },
"remove_inspector":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"reorder_inspection_form_categories":
{ Args: { "p_category_ids": (string)[],"p_form_version_id": string }; Returns: undefined
                           },
"reorder_inspection_form_questions":
{ Args: { "p_category_id": string,"p_question_ids": (string)[] }; Returns: undefined
                           },
"reorder_listing_photos":
{ Args: { "p_listing_id": string,"p_photo_ids": (string)[] }; Returns: undefined
                           },
"reschedule_inspection":
{ Args: { "p_inspection_id": string,"p_starts_at": string }; Returns: undefined
                           },
"resolve_report_share_link":
{ Args: { "p_report_id": string,"p_token": string }; Returns: {
              "address_text": string,"created_at": string,"declared_area_m2": number,"declared_building_floors": number,"declared_construction_year": number,"declared_floor": number,"declared_rooms": number,"generated_at": string,"id": string,"latitude": number,"longitude": number,"number": number,"overall_score": number,"result": Json,"status": Database["public"]['Enums']["online_report_status"]
            }[]
                           },
"restore_consent_version":
{ Args: { "p_consent_version_id": string }; Returns: string
                           },
"restore_inspection_form_version":
{ Args: { "p_form_version_id": string }; Returns: string
                           },
"revoke_report_share_link":
{ Args: { "p_report_id": string }; Returns: undefined
                           },
"save_consent_sections":
{ Args: { "p_consent_version_id": string,"p_sections": Json }; Returns: undefined
                           },
"save_inspection_answer":
{ Args: { "p_answer"?: Database["public"]['Enums']["inspection_answer"],"p_inspection_id": string,"p_note"?: string,"p_question_id": string }; Returns: undefined
                           },
"set_inspector":
{ Args: { "p_city_id": string,"p_user_id": string }; Returns: undefined
                           },
"set_inspector_weekly_hours":
{ Args: { "p_inspector_id": string,"p_ranges": Json,"p_weekday": number }; Returns: undefined
                           },
"split_inspection_form_question_weights":
{ Args: { "p_category_id": string }; Returns: undefined
                           },
"start_inspection":
{ Args: { "p_accepted_section_ids": (string)[],"p_inspection_id": string,"p_language": string,"p_latitude"?: number,"p_longitude"?: number,"p_signature_path": string,"p_signer_name": string }; Returns: undefined
                           },
"start_listing_revision":
{ Args: { "p_listing_id": string }; Returns: string
                           },
"submit_inspection":
{ Args: { "p_inspection_id": string,"p_owner_name": string }; Returns: undefined
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
"county_id": string | null,
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
"location_3857": unknown,
"longitude": number,
"owner_id": string,
"parking_spaces": number | null,
"partitioning": Database["public"]['Enums']["listing_partitioning"] | null,
"pets": Database["public"]['Enums']["listing_pets"] | null,
"photo_path": string | null,
"pool": Database["public"]['Enums']["listing_pool"] | null,
"price": number,
"price_band": number | null,
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
      } },
"unassign_inspector":
{ Args: { "p_inspection_id": string }; Returns: undefined
                           },
"unblock_user":
{ Args: { "p_user_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "user"|"admin"|"inspector","form_version_status": "draft"|"published"|"archived","inspection_access_mode": "self"|"other","inspection_answer": "good"|"acceptable"|"problem"|"not_applicable","inspection_event_kind": "booked"|"rescheduled"|"assigned"|"unassigned"|"cancelled"|"started"|"submitted","inspection_media_kind": "photo"|"video","inspection_payment_method": "card"|"apple_pay"|"google_pay","inspection_payment_status": "unpaid"|"paid"|"refunded","inspection_required_media": "photo"|"video"|"none","inspection_status": "scheduled"|"inspector_assigned"|"in_progress"|"completed"|"book_ready"|"cancelled","inspector_exception_kind": "day_off"|"leave"|"training"|"other","listing_building_service": "administration"|"cleaning"|"security"|"video_surveillance","listing_building_type": "apartment_block"|"house_villa","listing_comfort": "first"|"second"|"third"|"luxury","listing_cooling": "air_conditioning"|"fan_heaters"|"fan_coils","listing_decision": "approved"|"rejected"|"blocked","listing_decision_reason": "photos"|"personal_data"|"price_area"|"description"|"contact_details"|"duplicate"|"unavailable"|"rules","listing_furnishing": "furnished"|"unfurnished"|"partly_furnished","listing_heating": "building_boiler"|"own_boiler"|"convector"|"infrared_panels"|"district_heating"|"heat_pump"|"solar_panels","listing_house_type": "detached"|"duplex"|"triplex"|"terraced"|"other","listing_interior_condition": "renovated"|"good"|"needs_renovation","listing_partitioning": "detached"|"semi_detached"|"non_detached"|"circular","listing_pets": "allowed"|"not_allowed","listing_pool": "own"|"shared","listing_property_type": "apartment"|"house","listing_status": "draft"|"pending_approval"|"approved"|"rejected"|"blocked"|"suspended","listing_transaction": "sale"|"rent","listing_utility": "water"|"sewerage"|"gas"|"electricity"|"cable_tv"|"internet","listing_verification": "physical"|"smartcheck"|"none","listing_yard": "yard"|"shared_yard"|"garden","online_report_status": "pending_payment"|"generating"|"ready"|"failed","scoring_kind": "online"|"inspection","snapshot_status": "building"|"ready"|"failed"|"superseded"
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
            "app_role": ["user", "admin", "inspector"],"form_version_status": ["draft", "published", "archived"],"inspection_access_mode": ["self", "other"],"inspection_answer": ["good", "acceptable", "problem", "not_applicable"],"inspection_event_kind": ["booked", "rescheduled", "assigned", "unassigned", "cancelled", "started", "submitted"],"inspection_media_kind": ["photo", "video"],"inspection_payment_method": ["card", "apple_pay", "google_pay"],"inspection_payment_status": ["unpaid", "paid", "refunded"],"inspection_required_media": ["photo", "video", "none"],"inspection_status": ["scheduled", "inspector_assigned", "in_progress", "completed", "book_ready", "cancelled"],"inspector_exception_kind": ["day_off", "leave", "training", "other"],"listing_building_service": ["administration", "cleaning", "security", "video_surveillance"],"listing_building_type": ["apartment_block", "house_villa"],"listing_comfort": ["first", "second", "third", "luxury"],"listing_cooling": ["air_conditioning", "fan_heaters", "fan_coils"],"listing_decision": ["approved", "rejected", "blocked"],"listing_decision_reason": ["photos", "personal_data", "price_area", "description", "contact_details", "duplicate", "unavailable", "rules"],"listing_furnishing": ["furnished", "unfurnished", "partly_furnished"],"listing_heating": ["building_boiler", "own_boiler", "convector", "infrared_panels", "district_heating", "heat_pump", "solar_panels"],"listing_house_type": ["detached", "duplex", "triplex", "terraced", "other"],"listing_interior_condition": ["renovated", "good", "needs_renovation"],"listing_partitioning": ["detached", "semi_detached", "non_detached", "circular"],"listing_pets": ["allowed", "not_allowed"],"listing_pool": ["own", "shared"],"listing_property_type": ["apartment", "house"],"listing_status": ["draft", "pending_approval", "approved", "rejected", "blocked", "suspended"],"listing_transaction": ["sale", "rent"],"listing_utility": ["water", "sewerage", "gas", "electricity", "cable_tv", "internet"],"listing_verification": ["physical", "smartcheck", "none"],"listing_yard": ["yard", "shared_yard", "garden"],"online_report_status": ["pending_payment", "generating", "ready", "failed"],"scoring_kind": ["online", "inspection"],"snapshot_status": ["building", "ready", "failed", "superseded"]
          }
        }
} as const
