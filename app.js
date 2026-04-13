
// ✅ IMPORT FIRST
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ✅ DEFINE FIRST
const supabaseUrl = 'https://wtbohjgrwmuxpxzentnk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Ym9oamdyd211eHB4emVudG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjEwNTgsImV4cCI6MjA5MTU5NzA1OH0.KoOxU5Oj96LZDhNN8sinQbwW8lE5Tgw2lF-utwSN-os'

const supabase = createClient(supabaseUrl, supabaseKey)

// ✅ MAKE IT GLOBAL (IMPORTANT FIX)
window.supabase = supabase

let selectedProductId = null
let selectedProductPrice = 0
let editingIngredientId = null

// TAB
window.showTab = function(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'))
  document.getElementById(tab).classList.remove('hidden')
}

// INIT
window.addEventListener('DOMContentLoaded', () => {
  loadProducts()
  loadSales()
  loadDashboard()
  loadProductList()
})

// ================= PRODUCTS =================

window.addProduct = async () => {
  await supabase.from('products').insert([{
    name: productName.value,
    price: productPrice.value
  }])

  productName.value = ''
  productPrice.value = ''

  loadProductList()
  loadProducts()
}

window.editProduct = (id, name, price) => {
  productName.value = name
  productPrice.value = price
  window.editingId = id
}

window.updateProduct = async () => {
  await supabase.from('products')
    .update({
      name: productName.value,
      price: productPrice.value
    })
    .eq('id', window.editingId)

  productName.value = ''
  productPrice.value = ''
  window.editingId = null

  loadProductList()
  loadProducts()
}

window.deleteProduct = async (id) => {
  await supabase.from('products').delete().eq('id', id)
  loadProductList()
}

// SELECT PRODUCT
window.selectProduct = async (id, name, price) => {
  selectedProductId = id
  selectedProductPrice = price

  productTitle.textContent = name
  document.getElementById('productDetails').classList.remove('hidden')

  loadIngredients()
}

// TABLE
async function loadProductList() {
  const { data } = await supabase.from('products').select('*')

  productList.innerHTML = ''

  for (let p of data) {
    const cost = await getProductCost(p.id)
    const profit = p.price - cost

    productList.innerHTML += `
      <tr>
        <td class="p-2">${p.name}</td>
        <td class="p-2">₱${p.price}</td>
        <td class="p-2">₱${cost}</td>
        <td class="p-2">₱${profit}</td>
        <td class="p-2 space-x-2">
          <button onclick="selectProduct('${p.id}','${p.name}',${p.price})" class="bg-green-500 text-white px-2 py-1 rounded">View Ingredients and Expenses</button>
          <button onclick="editProduct('${p.id}','${p.name}',${p.price})" class="bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
          <button onclick="deleteProduct('${p.id}')" class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
        </td>
      </tr>
    `
  }
}

// ================= COST =================

async function getProductCost(productId) {
  const { data } = await supabase
    .from('ingredients')
    .select('cost')
    .eq('product_id', productId)

  return data.reduce((sum, i) => sum + Number(i.cost), 0)
}

// ================= INGREDIENTS =================

// ADD / UPDATE
window.addIngredient = async () => {

  if (!selectedProductId) return alert("Select a product first")

  if (editingIngredientId) {
    // UPDATE
    await supabase
      .from('ingredients')
      .update({
        name: ingredientName.value,
        cost: ingredientCost.value
      })
      .eq('id', editingIngredientId)

    editingIngredientId = null
    document.getElementById('ingredientBtn').textContent = "Add"

  } else {
    // INSERT
    await supabase.from('ingredients').insert([{
      name: ingredientName.value,
      cost: ingredientCost.value,
      product_id: selectedProductId
    }])
  }

  ingredientName.value = ''
  ingredientCost.value = ''

  loadIngredients()
}

// EDIT
window.editIngredient = (id, name, cost) => {
  ingredientName.value = name
  ingredientCost.value = cost
  editingIngredientId = id

  document.getElementById('ingredientBtn').textContent = "Update"
}

// DELETE
window.deleteIngredient = async (id) => {
  await supabase.from('ingredients').delete().eq('id', id)
  loadIngredients()
}

// LOAD
async function loadIngredients() {
  const { data } = await supabase
    .from('ingredients')
    .select('*')
    .eq('product_id', selectedProductId)

  ingredientList.innerHTML = ''

  let total = 0

  data.forEach(i => {
    total += Number(i.cost)

    ingredientList.innerHTML += `
      <tr>
        <td class="p-2">${i.name}</td>
        <td class="p-2">₱${i.cost}</td>
        <td class="p-2 space-x-2">
          <button onclick="editIngredient('${i.id}','${i.name}',${i.cost})"
            class="bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
          <button onclick="deleteIngredient('${i.id}')"
            class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
        </td>
      </tr>
    `
  })

  totalCostView.textContent = total
  profitView.textContent = selectedProductPrice - total
}

// ================= SALES =================

async function loadProducts() {
  const { data } = await supabase.from('products').select('*')

  productSelect.innerHTML = `<option value="">Select</option>`
  data.forEach(p => {
    productSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`
  })
}

window.addSale = async () => {
  await supabase.rpc('make_sale', {
    p_product_id: productSelect.value,
    p_quantity: parseInt(saleQty.value)
  })

  loadSales()
  loadDashboard()
}

async function loadSales() {
  const { data } = await supabase
    .from('sales')
    .select('*, products(name)')
    .order('created_at', { ascending: false })

  salesList.innerHTML = ''
  data.forEach(s => {
    salesList.innerHTML += `<li>${s.products?.name} | Qty: ${s.quantity}</li>`
  })
}

// ================= DASHBOARD =================

let chart

async function loadDashboard() {
  const { data } = await supabase.from('sales').select('*')

  const totalSalesVal = data.reduce((a, b) => a + Number(b.total_amount), 0)
  const totalCostVal = data.reduce((a, b) => a + Number(b.total_cost), 0)
  const totalProfitVal = data.reduce((a, b) => a + Number(b.profit), 0)

  document.getElementById('totalSales').textContent = totalSalesVal
  document.getElementById('totalCost').textContent = totalCostVal
  document.getElementById('totalProfit').textContent = totalProfitVal

  renderChart(data)
}

// CHART
function renderChart(sales) {
  const ctx = document.getElementById('salesChart')

  const labels = sales.map(s =>
    new Date(s.created_at).toLocaleDateString()
  )

  const values = sales.map(s => s.total_amount)

  if (chart) chart.destroy()

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Sales', data: values }]
    }
  })
}