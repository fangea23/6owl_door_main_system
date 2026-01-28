import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';

/**
 * 供應商申請管理 Hook
 * 處理供應商新增/變更申請的 CRUD 和簽核操作
 */
export function useSupplierRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 載入申請列表
  const fetchRequests = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('erp_supplier_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // 篩選條件
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.request_type) {
        query = query.eq('request_type', filters.request_type);
      }
      if (filters.applicant_id) {
        query = query.eq('applicant_id', filters.applicant_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // 取得申請人資料
      const applicantIds = [...new Set(data.map(r => r.applicant_id).filter(Boolean))];
      let applicants = [];
      if (applicantIds.length > 0) {
        const { data: empData } = await supabase
          .from('employees')
          .select('user_id, name, employee_id')
          .in('user_id', applicantIds);
        applicants = empData || [];
      }

      // 組合資料
      const enrichedData = data.map(req => ({
        ...req,
        applicant: applicants.find(e => e.user_id === req.applicant_id)
      }));

      setRequests(enrichedData);
      return { success: true, data: enrichedData };
    } catch (err) {
      console.error('Error fetching supplier requests:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // 取得單筆申請詳情
  const getRequestDetail = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('erp_supplier_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 取得申請人資料
      let applicant = null;
      if (data.applicant_id) {
        const { data: empData } = await supabase
          .from('employees')
          .select('user_id, name, employee_id')
          .eq('user_id', data.applicant_id)
          .single();
        applicant = empData;
      }

      // 取得簽核記錄
      const { data: approvals } = await supabase
        .from('erp_supplier_request_approvals')
        .select('*')
        .eq('request_id', id)
        .order('created_at');

      // 取得簽核人員資料
      const approverIds = [...new Set((approvals || []).map(a => a.approver_id).filter(Boolean))];
      let approvers = [];
      if (approverIds.length > 0) {
        const { data: approverData } = await supabase
          .from('employees')
          .select('user_id, name')
          .in('user_id', approverIds);
        approvers = approverData || [];
      }

      const enrichedApprovals = (approvals || []).map(a => ({
        ...a,
        approver: approvers.find(e => e.user_id === a.approver_id)
      }));

      // 取得品牌資料
      let brands = [];
      if (data.brand_codes && data.brand_codes.length > 0) {
        const { data: brandData } = await supabase
          .from('brands')
          .select('id, code, name')
          .in('code', data.brand_codes);
        brands = brandData || [];
      }

      return {
        success: true,
        data: {
          ...data,
          applicant,
          approvals: enrichedApprovals,
          brands
        }
      };
    } catch (err) {
      console.error('Error fetching request detail:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // 產生申請單號
  const generateRequestNumber = useCallback(async () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SR-${dateStr}`;

    // 查詢今天已有的申請單數量
    const { data, error } = await supabase
      .from('erp_supplier_requests')
      .select('request_number')
      .like('request_number', `${prefix}%`)
      .order('request_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error generating request number:', error);
      return `${prefix}-001`;
    }

    if (data && data.length > 0) {
      const lastNumber = data[0].request_number;
      const seq = parseInt(lastNumber.split('-')[2], 10) + 1;
      return `${prefix}-${String(seq).padStart(3, '0')}`;
    }

    return `${prefix}-001`;
  }, []);

  // 建立供應商申請
  const createRequest = useCallback(async (formData) => {
    try {
      setLoading(true);
      setError(null);

      const requestNumber = await generateRequestNumber();

      const insertData = {
        request_number: requestNumber,
        request_type: formData.request_type || 'new',
        brand_codes: formData.brand_codes || [],
        supplier_id: formData.supplier_id || null,
        company_name: formData.company_name,
        tax_id: formData.tax_id,
        capital: formData.capital,
        responsible_person: formData.responsible_person,
        main_business: formData.main_business,
        registered_address: formData.registered_address,
        contact_address_same: formData.contact_address_same ?? true,
        contact_address: formData.contact_address,
        contact_sales_name: formData.contact_sales_name,
        contact_sales_email: formData.contact_sales_email,
        contact_sales_mobile: formData.contact_sales_mobile,
        contact_accounting_name: formData.contact_accounting_name,
        contact_accounting_email: formData.contact_accounting_email,
        contact_accounting_phone: formData.contact_accounting_phone,
        contact_accounting_fax: formData.contact_accounting_fax,
        invoice_type: formData.invoice_type || 'with_goods',
        invoice_format: formData.invoice_format,
        tax_type: formData.tax_type || 'tax_included',
        payment_days: formData.payment_days || 'cod_5days',
        payment_days_other: formData.payment_days_other,
        payment_method: formData.payment_method || 'wire',
        payment_method_other: formData.payment_method_other,
        billing_method: formData.billing_method || ['email'],
        bank_code: formData.bank_code,
        bank_name: formData.bank_name,
        branch_code: formData.branch_code,
        branch_name: formData.branch_name,
        account_name: formData.account_name,
        account_number: formData.account_number,
        related_company_payment: formData.related_company_payment || false,
        related_company_name: formData.related_company_name,
        supplier_category: formData.supplier_category,
        applicant_id: user.id,
        status: 'pending_finance'
      };

      const { data, error: insertError } = await supabase
        .from('erp_supplier_requests')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      return { success: true, data };
    } catch (err) {
      console.error('Error creating supplier request:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user, generateRequestNumber]);

  // 簽核申請
  const approveRequest = useCallback(async (requestId, stage, action, comments = '') => {
    try {
      setLoading(true);
      setError(null);

      // 取得當前申請狀態
      const { data: request, error: fetchError } = await supabase
        .from('erp_supplier_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // 驗證當前狀態是否正確
      const expectedStatus = `pending_${stage}`;
      if (request.status !== expectedStatus) {
        throw new Error(`狀態不正確，目前為 ${request.status}，預期為 ${expectedStatus}`);
      }

      // 新增簽核記錄
      const { error: approvalError } = await supabase
        .from('erp_supplier_request_approvals')
        .insert({
          request_id: requestId,
          stage,
          action,
          approver_id: user.id,
          comments
        });

      if (approvalError) throw approvalError;

      // 更新申請單狀態
      let updateData = {};
      const now = new Date().toISOString();

      if (action === 'approve') {
        // 核准 - 進入下一關卡
        if (stage === 'finance') {
          updateData = {
            status: 'pending_accounting',
            finance_approved_at: now,
            finance_approved_by: user.id
          };
        } else if (stage === 'accounting') {
          updateData = {
            status: 'pending_creator',
            accounting_approved_at: now,
            accounting_approved_by: user.id
          };
        } else if (stage === 'creator') {
          updateData = {
            status: 'completed',
            creator_approved_at: now,
            creator_approved_by: user.id
          };
        }
      } else {
        // 退回
        updateData = {
          status: 'rejected',
          rejection_reason: comments
        };
      }

      const { error: updateError } = await supabase
        .from('erp_supplier_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      // 若完成，建立供應商主檔
      if (action === 'approve' && stage === 'creator') {
        await createSupplierFromRequest(request);
      }

      return { success: true };
    } catch (err) {
      console.error('Error approving request:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 從申請單建立供應商主檔
  const createSupplierFromRequest = async (request) => {
    try {
      // 建立供應商
      const { data: supplier, error: supplierError } = await supabase
        .from('erp_suppliers')
        .insert({
          supplier_code: request.supplier_code,
          supplier_short_name: request.supplier_short_name,
          company_name: request.company_name,
          tax_id: request.tax_id,
          capital: request.capital,
          responsible_person: request.responsible_person,
          main_business: request.main_business,
          registered_address: request.registered_address,
          contact_address_same: request.contact_address_same,
          contact_address: request.contact_address,
          contact_sales_name: request.contact_sales_name,
          contact_sales_email: request.contact_sales_email,
          contact_sales_mobile: request.contact_sales_mobile,
          contact_accounting_name: request.contact_accounting_name,
          contact_accounting_email: request.contact_accounting_email,
          contact_accounting_phone: request.contact_accounting_phone,
          contact_accounting_fax: request.contact_accounting_fax,
          invoice_type: request.invoice_type,
          invoice_format: request.invoice_format,
          tax_type: request.tax_type,
          payment_days: request.payment_days,
          payment_days_other: request.payment_days_other,
          payment_method: request.payment_method,
          payment_method_other: request.payment_method_other,
          billing_method: request.billing_method,
          bank_code: request.bank_code,
          bank_name: request.bank_name,
          branch_code: request.branch_code,
          branch_name: request.branch_name,
          account_name: request.account_name,
          account_number: request.account_number,
          related_company_payment: request.related_company_payment,
          related_company_name: request.related_company_name,
          supplier_category: request.supplier_category,
          entity_type: request.entity_type,
          einvoice_export_format: request.einvoice_export_format,
          created_by: request.applicant_id
        })
        .select()
        .single();

      if (supplierError) throw supplierError;

      // 建立品牌關聯
      if (request.brand_codes && request.brand_codes.length > 0) {
        // 取得品牌 ID
        const { data: brands } = await supabase
          .from('brands')
          .select('id, code')
          .in('code', request.brand_codes);

        if (brands && brands.length > 0) {
          const brandRelations = brands.map(b => ({
            supplier_id: supplier.id,
            brand_id: b.id
          }));

          await supabase
            .from('erp_supplier_brands')
            .insert(brandRelations);
        }
      }

      // 更新申請單關聯
      await supabase
        .from('erp_supplier_requests')
        .update({ supplier_id: supplier.id })
        .eq('id', request.id);

      return { success: true, supplier };
    } catch (err) {
      console.error('Error creating supplier from request:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    requests,
    loading,
    error,
    fetchRequests,
    getRequestDetail,
    createRequest,
    approveRequest
  };
}

/**
 * 供應商主檔管理 Hook
 */
export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 載入供應商列表
  const fetchSuppliers = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('erp_suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters.supplier_category) {
        query = query.eq('supplier_category', filters.supplier_category);
      }
      if (filters.search) {
        query = query.or(`company_name.ilike.%${filters.search}%,supplier_code.ilike.%${filters.search}%,tax_id.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // 取得品牌關聯
      const supplierIds = data.map(s => s.id);
      let brandRelations = [];
      if (supplierIds.length > 0) {
        const { data: relations } = await supabase
          .from('erp_supplier_brands')
          .select('supplier_id, brand_id, brands(id, code, name)')
          .in('supplier_id', supplierIds);
        brandRelations = relations || [];
      }

      // 組合資料
      const enrichedData = data.map(supplier => ({
        ...supplier,
        brands: brandRelations
          .filter(r => r.supplier_id === supplier.id)
          .map(r => r.brands)
      }));

      setSuppliers(enrichedData);
      return { success: true, data: enrichedData };
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    suppliers,
    loading,
    error,
    fetchSuppliers
  };
}
