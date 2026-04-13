
// ✅ IMPORT FIRST
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ✅ DEFINE FIRST
const supabaseUrl = 'https://wtbohjgrwmuxpxzentnk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Ym9oamdyd211eHB4emVudG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjEwNTgsImV4cCI6MjA5MTU5NzA1OH0.KoOxU5Oj96LZDhNN8sinQbwW8lE5Tgw2lF-utwSN-os'

const supabase = createClient(supabaseUrl, supabaseKey)

// make global
window.supabase = supabase

// ================= STATE =================
let selectedProductId = null
let selectedProductPrice = 0
let editingIngredientId = null
let editingSaleId = null
let chart = null

// ================= TAB =================
window.showTab = function(tab){
  document.querySelectorAll('.tab').forEach(t=>t.classList.add('hidden'))
  document.getElementById(tab).classList.remove('hidden')
}

// ================= INIT =================
window.addEventListener('DOMContentLoaded', ()=>{
  console.log("JS LOADED")

  loadProducts()
  loadProductList()
  loadSales()
  loadDashboard()
})

// ================= PRODUCTS =================

window.addProduct = async ()=>{
  if(!productName.value || !productPrice.value) return

  await supabase.from('products').insert([{
    name: productName.value,
    price: productPrice.value
  }])

  productName.value=''
  productPrice.value=''

  loadProductList()
  loadProducts()
}

window.editProduct = (id,name,price)=>{
  productName.value=name
  productPrice.value=price
  window.editingId=id
}

window.updateProduct = async ()=>{
  if(!window.editingId) return

  await supabase.from('products')
    .update({
      name:productName.value,
      price:productPrice.value
    })
    .eq('id',window.editingId)

  window.editingId=null
  productName.value=''
  productPrice.value=''

  loadProductList()
  loadProducts()
}

window.deleteProduct = async (id)=>{
  await supabase.from('products').delete().eq('id',id)
  loadProductList()
}

// SELECT PRODUCT
window.selectProduct = (id,name,price)=>{
  selectedProductId=id
  selectedProductPrice=price

  document.getElementById('productTitle').textContent=name
  document.getElementById('productDetails').classList.remove('hidden')

  loadIngredients()
}

// PRODUCT LIST
async function loadProductList(){
  const {data,error}=await supabase.from('products').select('*')
  if(error) return console.error(error)

  productList.innerHTML=''

  for(let p of (data || [])){
    const cost = await getProductCost(p.id)
    const profit = p.price - cost

    productList.innerHTML += `
      <tr class="border-b hover:bg-gray-50">
        <td class="p-3">${p.name}</td>
        <td class="p-3">₱${p.price}</td>
        <td class="p-3">₱${cost}</td>
        <td class="p-3 text-blue-600 font-bold">₱${profit}</td>
        <td class="p-3 space-x-2">
          <button onclick="selectProduct('${p.id}','${p.name}',${p.price})" class="bg-green-500 px-2 text-white rounded">View</button>
          <button onclick="editProduct('${p.id}','${p.name}',${p.price})" class="bg-blue-500 px-2 text-white rounded">Edit</button>
          <button onclick="deleteProduct('${p.id}')" class="bg-red-500 px-2 text-white rounded">Delete</button>
        </td>
      </tr>`
  }
}

// ================= COST =================

async function getProductCost(id){
  const {data}=await supabase
    .from('ingredients')
    .select('cost')
    .eq('product_id',id)

  return (data || []).reduce((a,b)=>a+Number(b.cost),0)
}

// ================= INGREDIENTS =================

window.addIngredient = async ()=>{
  if(!selectedProductId) return alert("Select product first")

  if(editingIngredientId){
    await supabase.from('ingredients')
      .update({
        name:ingredientName.value,
        cost:ingredientCost.value
      })
      .eq('id',editingIngredientId)

    editingIngredientId=null
    ingredientBtn.textContent="Add"

  }else{
    await supabase.from('ingredients').insert([{
      name:ingredientName.value,
      cost:ingredientCost.value,
      product_id:selectedProductId
    }])
  }

  ingredientName.value=''
  ingredientCost.value=''

  loadIngredients()
}

window.editIngredient = (id,name,cost)=>{
  ingredientName.value=name
  ingredientCost.value=cost
  editingIngredientId=id
  ingredientBtn.textContent="Update"
}

window.deleteIngredient = async (id)=>{
  await supabase.from('ingredients').delete().eq('id',id)
  loadIngredients()
}

async function loadIngredients(){
  const {data}=await supabase
    .from('ingredients')
    .select('*')
    .eq('product_id',selectedProductId)

  ingredientList.innerHTML=''
  let total=0

  ;(data || []).forEach(i=>{
    total+=Number(i.cost)

    ingredientList.innerHTML += `
      <tr class="border-b">
        <td class="p-2">${i.name}</td>
        <td class="p-2">₱${i.cost}</td>
        <td class="p-2 space-x-2">
          <button onclick="editIngredient('${i.id}','${i.name}',${i.cost})" class="bg-blue-500 text-white px-2 rounded">Edit</button>
          <button onclick="deleteIngredient('${i.id}')" class="bg-red-500 text-white px-2 rounded">Delete</button>
        </td>
      </tr>`
  })

  document.getElementById('totalCostView').textContent = total
  document.getElementById('profitView').textContent = selectedProductPrice - total
}

// ================= SALES =================

async function loadProducts(){
  const {data}=await supabase.from('products').select('*')

  productSelect.innerHTML=`<option value="">Select</option>`

  ;(data || []).forEach(p=>{
    productSelect.innerHTML+=`<option value="${p.id}">${p.name}</option>`
  })
}

// 🔥 FIXED FUNCTION (GLOBAL + NOT OVERRIDDEN)
window.addOrUpdateSale = async ()=>{
  const productId = productSelect.value
  const qty = parseInt(saleQty.value)

  if(!productId || !qty) return alert("Fill all fields")

  const {data:product}=await supabase
    .from('products')
    .select('*')
    .eq('id',productId)
    .single()

  const {data:ingredients}=await supabase
    .from('ingredients')
    .select('cost')
    .eq('product_id',productId)

  const costPerUnit = (ingredients || []).reduce((a,b)=>a+Number(b.cost),0)

  const totalAmount = product.price * qty
  const totalCost = costPerUnit * qty
  const profit = totalAmount - totalCost

  if(editingSaleId){
    await supabase.from('sales')
      .update({
        product_id:productId,
        quantity:qty,
        total_amount:totalAmount,
        total_cost:totalCost,
        profit:profit
      })
      .eq('id',editingSaleId)

    editingSaleId=null
  }else{
    await supabase.from('sales').insert([{
      product_id:productId,
      quantity:qty,
      total_amount:totalAmount,
      total_cost:totalCost,
      profit:profit
    }])
  }

  saleQty.value=''

  loadSales()
  loadDashboard()
}

window.editSale = (id,productId,qty)=>{
  editingSaleId=id
  productSelect.value=productId
  saleQty.value=qty
}

window.deleteSale = async (id)=>{
  await supabase.from('sales').delete().eq('id',id)
  loadSales()
  loadDashboard()
}

async function loadSales(){
  const {data,error}=await supabase
    .from('sales')
    .select('*, products(name)')
    .order('created_at',{ascending:false})

  if(error){
    console.error(error)
    return
  }

  salesList.innerHTML=''

  if(!data || data.length===0){
    salesList.innerHTML=`<tr><td colspan="6" class="p-4 text-center">No sales yet</td></tr>`
    return
  }

  data.forEach(s=>{
    salesList.innerHTML+=`
      <tr class="border-b hover:bg-gray-50">
        <td class="p-3">${s.products?.name || 'N/A'}</td>
        <td class="p-3">${s.quantity}</td>
        <td class="p-3 text-green-600">₱${s.total_amount}</td>
        <td class="p-3">₱${s.total_cost}</td>
        <td class="p-3 text-blue-600 font-bold">₱${s.profit}</td>
        <td class="p-3 space-x-2">
          <button onclick="editSale('${s.id}','${s.product_id}',${s.quantity})" class="bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
          <button onclick="deleteSale('${s.id}')" class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
        </td>
      </tr>`
  })
}

// ================= DASHBOARD =================

async function loadDashboard(){
  const {data}=await supabase.from('sales').select('*')

  const totalSalesVal = (data||[]).reduce((a,b)=>a+Number(b.total_amount),0)
  const totalCostVal = (data||[]).reduce((a,b)=>a+Number(b.total_cost),0)
  const totalProfitVal = (data||[]).reduce((a,b)=>a+Number(b.profit),0)

  document.getElementById('totalSales').textContent = totalSalesVal
  document.getElementById('totalCost').textContent = totalCostVal
  document.getElementById('totalProfit').textContent = totalProfitVal

  renderChart(data || [])
}

// ================= CHART =================

function renderChart(sales){
  const ctx=document.getElementById('salesChart')

  if(chart) chart.destroy()

  chart=new Chart(ctx,{
    type:'bar',
    data:{
      labels:sales.map(s=>new Date(s.created_at).toLocaleDateString()),
      datasets:[{label:'Sales',data:sales.map(s=>s.total_amount)}]
    }
  })
}