const SUPABASE_URL = "https://fzbheuoaxnenhrwadrvn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6YmhldW9heG5lbmhyd2FkcnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDUwOTMsImV4cCI6MjA3MDA4MTA5M30.49jF_IMBuvKt-HWpmN-9USgw6tDqUKzrW1uaOqNFi40"; // tu clave
console.log("JS cargado correctamente");

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let estudianteEditandoId = null;

// Agregar estudiante
async function agregarEstudiante() {
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const clase  = document.getElementById("clase").value.trim();

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return alert("No estás autenticado.");

  const { error } = await client.from("estudiantes").insert({
    nombre, correo, clase, user_id: user.id,
  });

  if (error) return alert("Error al agregar: " + error.message);

  alert("Estudiante agregado");
  limpiarFormulario();
  cargarEstudiantes();
}

// Cargar estudiantes
async function cargarEstudiantes() {
  const { data, error } = await client
    .from("estudiantes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return alert("Error al cargar estudiantes: " + error.message);

  const lista = document.getElementById("lista-estudiantes");
  lista.innerHTML = "";

  data.forEach((est) => {
    const item = document.createElement("li");
    item.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");

    const info = document.createElement("span");
    info.innerHTML = `<strong>${est.nombre}</strong> (${est.clase}) - ${est.correo}`;

    const btnEditar = document.createElement("button");
    btnEditar.classList.add("btn", "btn-warning", "btn-sm", "me-2");
    btnEditar.innerHTML = '<i class="fas fa-pencil-alt"></i>';
    btnEditar.addEventListener("click", () => editarEstudiante(est.id, est.nombre, est.correo, est.clase));

    const btnEliminar = document.createElement("button");
    btnEliminar.classList.add("btn", "btn-danger", "btn-sm");
    btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
    btnEliminar.addEventListener("click", () => eliminarEstudiante(est.id));

    const acciones = document.createElement("div");
    acciones.appendChild(btnEditar);
    acciones.appendChild(btnEliminar);

    item.appendChild(info);
    item.appendChild(acciones);
    lista.appendChild(item);
  });
}

// Editar estudiante
function editarEstudiante(id, nombre, correo, clase) {
  document.getElementById("nombre").value = nombre;
  document.getElementById("correo").value = correo;
  document.getElementById("clase").value  = clase;
  estudianteEditandoId = id;

  const btn = document.getElementById("btn-guardar");
  btn.innerHTML = '<i class="fas fa-check-circle"></i> Actualizar';
  btn.onclick = actualizarEstudiante;
}

// Actualizar estudiante
async function actualizarEstudiante() {
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const clase  = document.getElementById("clase").value.trim();

  const { error } = await client
    .from("estudiantes")
    .update({ nombre, correo, clase })
    .eq("id", estudianteEditandoId);

  if (error) return alert("Error al actualizar: " + error.message);

  alert("Estudiante actualizado");
  estudianteEditandoId = null;
  limpiarFormulario();
  cargarEstudiantes();
}

// Eliminar estudiante
async function eliminarEstudiante(id) {
  if (!confirm("¿Seguro que quieres eliminar este estudiante?")) return;

  const { error } = await client.from("estudiantes").delete().eq("id", id);
  if (error) return alert("Error al eliminar: " + error.message);

  alert("Estudiante eliminado");
  cargarEstudiantes();
}

// Limpiar formulario y restaurar botón
function limpiarFormulario() {
  document.getElementById("nombre").value = "";
  document.getElementById("correo").value = "";
  document.getElementById("clase").value  = "";

  const btn = document.getElementById("btn-guardar");
  btn.innerHTML = '<i class="fas fa-plus-circle"></i> Agregar';
  btn.onclick = agregarEstudiante;
}

// Subir archivo
async function subirArchivo() {
  const archivoInput = document.getElementById("archivo");
  const archivo = archivoInput.files[0];
  if (!archivo) return alert("Selecciona un archivo primero.");

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return alert("Sesión no válida.");

  const nombreRuta = `${user.id}/${archivo.name}`; // <-- backticks y "/"
  const { error } = await client.storage
    .from("tareas")
    .upload(nombreRuta, archivo, {
      cacheControl: "3600",
      upsert: true, // opcional
    });

  if (error) return alert("Error al subir: " + error.message);

  alert("Archivo subido correctamente.");
  listarArchivos();
}

// Listar archivos
async function listarArchivos() {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return alert("Sesión no válida.");

  const path = `${user.id}/`; // <-- directorio del usuario (con "/")
  const { data, error } = await client.storage
    .from("tareas")
    .list(path, { limit: 20 });

  const lista = document.getElementById("lista-archivos");
  lista.innerHTML = "";

  if (error) {
    lista.innerHTML = "<li>Error al listar archivos</li>";
    return;
  }

  for (const archivo of data) {
    const { data: signedUrlData, error: signedUrlError } = await client.storage
      .from("tareas")
      .createSignedUrl(`${path}${archivo.name}`, 60);

    if (signedUrlError) {
      console.error("Error al generar URL firmada:", signedUrlError.message);
      continue;
    }

    const publicUrl = signedUrlData.signedUrl;
    const item = document.createElement("li");

    const esImagen = /\.(jpg|jpeg|png|gif|webp)$/i.test(archivo.name);
    const esPDF    = /\.pdf$/i.test(archivo.name);

    if (esImagen) {
      item.innerHTML = `
        <strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">
          <img src="${publicUrl}" width="150" style="border:1px solid #ccc; margin:5px;" />
        </a>
      `;
    } else if (esPDF) {
      item.innerHTML = `
        <strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">Ver PDF</a>
      `;
    } else {
      item.innerHTML = `<a href="${publicUrl}" target="_blank">${archivo.name}</a>`;
    }

    lista.appendChild(item);
  }
}

// Cerrar sesión
async function cerrarSesion() {
  const { error } = await client.auth.signOut();
  if (error) return alert("Error al cerrar sesión: " + error.message);
  localStorage.removeItem("token");
  alert("Sesión cerrada.");
  window.location.href = "index.html";
}

// Ejecutar al cargar
document.addEventListener("DOMContentLoaded", () => {
  cargarEstudiantes();
  listarArchivos();
});
